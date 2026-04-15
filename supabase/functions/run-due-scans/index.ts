import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Find all enabled scheduled scans that are due
    const now = new Date().toISOString();
    const { data: dueScans, error: fetchErr } = await supabase
      .from("scheduled_scans")
      .select("*")
      .eq("enabled", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now}`);

    if (fetchErr) throw new Error(`Failed to fetch due scans: ${fetchErr.message}`);
    if (!dueScans || dueScans.length === 0) {
      return new Response(JSON.stringify({ message: "No due scans", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ scan_id: string; user_id: string; status: string; error?: string }> = [];

    for (const scheduled of dueScans) {
      try {
        // 1. Fetch user's ZAP config
        const { data: config } = await supabase
          .from("user_scan_config")
          .select("*")
          .eq("user_id", scheduled.user_id)
          .single();

        if (!config?.zap_api_url || !config?.zap_api_key) {
          results.push({ scan_id: scheduled.id, user_id: scheduled.user_id, status: "skipped", error: "No ZAP config" });
          continue;
        }

        const zapBase = config.zap_api_url.replace(/\/$/, "");
        const zapKey = config.zap_api_key;

        async function zapFetch(path: string) {
          const sep = path.includes("?") ? "&" : "?";
          const url = `${zapBase}${path}${sep}apikey=${zapKey}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`ZAP error [${res.status}]: ${await res.text()}`);
          return res.json();
        }

        // 2. Create scan job with status "Running"
        const { data: job, error: jobErr } = await supabase
          .from("scan_jobs")
          .insert({
            user_id: scheduled.user_id,
            target_url: scheduled.target_url,
            status: "spidering",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (jobErr) throw new Error(`Job create failed: ${jobErr.message}`);

        // 3. Spider crawl
        const spiderResult = await zapFetch(
          `/JSON/spider/action/scan/?url=${encodeURIComponent(scheduled.target_url)}`
        );
        await supabase.from("scan_jobs").update({ zap_spider_id: String(spiderResult.scan) }).eq("id", job.id);

        // Poll spider until complete (max 5 min)
        const spiderStart = Date.now();
        while (Date.now() - spiderStart < 300_000) {
          const status = await zapFetch(`/JSON/spider/view/status/?scanId=${spiderResult.scan}`);
          const progress = parseInt(status.status, 10);
          await supabase.from("scan_jobs").update({ progress: Math.round(progress / 2) }).eq("id", job.id);
          if (progress >= 100) break;
          await new Promise((r) => setTimeout(r, 5000));
        }

        // 4. Active scan
        await supabase.from("scan_jobs").update({ status: "scanning", progress: 50 }).eq("id", job.id);
        const scanResult = await zapFetch(
          `/JSON/ascan/action/scan/?url=${encodeURIComponent(scheduled.target_url)}`
        );
        await supabase.from("scan_jobs").update({ zap_scan_id: String(scanResult.scan) }).eq("id", job.id);

        // Poll active scan (max 15 min)
        const scanStart = Date.now();
        while (Date.now() - scanStart < 900_000) {
          const status = await zapFetch(`/JSON/ascan/view/status/?scanId=${scanResult.scan}`);
          const scanProgress = parseInt(status.status, 10);
          await supabase.from("scan_jobs").update({ progress: 50 + Math.round(scanProgress / 2) }).eq("id", job.id);
          if (scanProgress >= 100) break;
          await new Promise((r) => setTimeout(r, 10000));
        }

        // 5. Fetch alerts and map to risk categories
        const alertsData = await zapFetch(
          `/JSON/core/view/alerts/?baseurl=${encodeURIComponent(scheduled.target_url)}&start=0&count=500`
        );
        const alerts = alertsData.alerts || [];

        if (alerts.length > 0) {
          const vulns = alerts.map((a: any) => ({
            scan_job_id: job.id,
            user_id: scheduled.user_id,
            alert_name: a.alert || a.name || "Unknown",
            risk_level: mapZapRisk(a.risk),
            confidence: a.confidence || "Low",
            description: a.description || "",
            solution: a.solution || "",
            reference: a.reference || "",
            cwe_id: a.cweid ? parseInt(a.cweid, 10) : null,
            wasc_id: a.wascid ? parseInt(a.wascid, 10) : null,
            url: a.url || "",
            parameter: a.param || "",
            evidence: a.evidence || "",
          }));
          await supabase.from("scan_vulnerabilities").insert(vulns);
        }

        // 6. Mark complete
        await supabase.from("scan_jobs").update({
          status: "completed",
          progress: 100,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);

        // 7. Update scheduled scan timestamps
        const nextRun = calculateNextRun(scheduled.cron_expression);
        await supabase.from("scheduled_scans").update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun,
        }).eq("id", scheduled.id);

        results.push({ scan_id: job.id, user_id: scheduled.user_id, status: "completed" });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Scan failed for ${scheduled.id}:`, errMsg);

        // Mark job as failed if it was created
        await supabase.from("scan_jobs").update({
          status: "failed",
          error_message: errMsg,
        }).eq("user_id", scheduled.user_id).eq("target_url", scheduled.target_url).eq("status", "spidering");

        results.push({ scan_id: scheduled.id, user_id: scheduled.user_id, status: "failed", error: errMsg });
      }
    }

    return new Response(JSON.stringify({ count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-due-scans error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Map ZAP risk strings to our standard categories
function mapZapRisk(risk: string): string {
  const r = (risk || "").toLowerCase();
  if (r === "high") return "High";
  if (r === "medium") return "Medium";
  if (r === "low") return "Low";
  if (r === "informational") return "Informational";
  // ZAP doesn't have "Critical" — we map High+confidence=High as Critical
  return risk || "Informational";
}

// Simple cron-to-next-run calculator for common patterns
function calculateNextRun(cron: string): string {
  const now = new Date();
  const parts = cron.split(" ");
  if (parts.length !== 5) {
    // Default: 1 week from now
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Daily scan: fixed hour/minute
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const next = new Date(now);
    next.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  // Weekly scan: specific day of week
  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    const targetDay = parseInt(dayOfWeek);
    const next = new Date(now);
    next.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
    const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntil);
    return next.toISOString();
  }

  // Default: 1 week
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
}
