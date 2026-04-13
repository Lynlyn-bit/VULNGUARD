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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { action, scan_job_id, target_url } = await req.json();

    // Get user's ZAP config
    const { data: config, error: configErr } = await supabase
      .from("user_scan_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (configErr || !config?.zap_api_url || !config?.zap_api_key) {
      return new Response(
        JSON.stringify({
          error:
            "ZAP API not configured. Please add your ZAP API URL and key in Settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const zapBase = config.zap_api_url.replace(/\/$/, "");
    const zapKey = config.zap_api_key;

    // Helper to call ZAP API
    async function zapFetch(path: string) {
      const separator = path.includes("?") ? "&" : "?";
      const url = `${zapBase}${path}${separator}apikey=${zapKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ZAP API error [${res.status}]: ${text}`);
      }
      return res.json();
    }

    // Action: start_spider
    if (action === "start_spider") {
      if (!target_url) {
        return new Response(
          JSON.stringify({ error: "target_url is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create scan job
      const { data: job, error: jobErr } = await supabase
        .from("scan_jobs")
        .insert({
          user_id: userId,
          target_url,
          status: "spidering",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobErr) throw new Error(`Failed to create scan job: ${jobErr.message}`);

      // Start ZAP spider
      const spiderResult = await zapFetch(
        `/JSON/spider/action/scan/?url=${encodeURIComponent(target_url)}`
      );

      // Update job with spider ID
      await supabase
        .from("scan_jobs")
        .update({ zap_spider_id: String(spiderResult.scan) })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({
          scan_job_id: job.id,
          spider_id: spiderResult.scan,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: check_spider
    if (action === "check_spider") {
      const { data: job } = await supabase
        .from("scan_jobs")
        .select("*")
        .eq("id", scan_job_id)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Scan job not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const status = await zapFetch(
        `/JSON/spider/view/status/?scanId=${job.zap_spider_id}`
      );

      const progress = parseInt(status.status, 10);
      await supabase
        .from("scan_jobs")
        .update({ progress: Math.round(progress / 2) }) // spider is first 50%
        .eq("id", scan_job_id);

      return new Response(
        JSON.stringify({ progress, complete: progress >= 100 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: start_active_scan
    if (action === "start_active_scan") {
      const { data: job } = await supabase
        .from("scan_jobs")
        .select("*")
        .eq("id", scan_job_id)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Scan job not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const scanResult = await zapFetch(
        `/JSON/ascan/action/scan/?url=${encodeURIComponent(job.target_url)}`
      );

      await supabase
        .from("scan_jobs")
        .update({
          status: "scanning",
          zap_scan_id: String(scanResult.scan),
          progress: 50,
        })
        .eq("id", scan_job_id);

      return new Response(
        JSON.stringify({ scan_id: scanResult.scan }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: check_scan
    if (action === "check_scan") {
      const { data: job } = await supabase
        .from("scan_jobs")
        .select("*")
        .eq("id", scan_job_id)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Scan job not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const status = await zapFetch(
        `/JSON/ascan/view/status/?scanId=${job.zap_scan_id}`
      );

      const scanProgress = parseInt(status.status, 10);
      const totalProgress = 50 + Math.round(scanProgress / 2);

      await supabase
        .from("scan_jobs")
        .update({ progress: totalProgress })
        .eq("id", scan_job_id);

      return new Response(
        JSON.stringify({
          progress: scanProgress,
          total_progress: totalProgress,
          complete: scanProgress >= 100,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: fetch_results
    if (action === "fetch_results") {
      const { data: job } = await supabase
        .from("scan_jobs")
        .select("*")
        .eq("id", scan_job_id)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Scan job not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch alerts from ZAP
      const alertsData = await zapFetch(
        `/JSON/core/view/alerts/?baseurl=${encodeURIComponent(job.target_url)}&start=0&count=100`
      );

      const alerts = alertsData.alerts || [];

      // Insert vulnerabilities
      if (alerts.length > 0) {
        const vulns = alerts.map((a: any) => ({
          scan_job_id: scan_job_id,
          user_id: userId,
          alert_name: a.alert || a.name || "Unknown",
          risk_level: a.risk || "Informational",
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

      // Mark job complete
      await supabase
        .from("scan_jobs")
        .update({
          status: "completed",
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("id", scan_job_id);

      return new Response(
        JSON.stringify({
          total_alerts: alerts.length,
          status: "completed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Invalid action. Use: start_spider, check_spider, start_active_scan, check_scan, fetch_results",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("zap-scan error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
