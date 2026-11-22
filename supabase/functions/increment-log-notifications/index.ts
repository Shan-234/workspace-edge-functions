import { withSupabase } from "npm:@supabase/server";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export default {
    fetch: withSupabase(
        { auth: "secret" },
        async (req: Request) => {
            try {
                const payload = await req.json();
                const new_record = payload.record;
                const old_record = payload.old_record;

                if (old_record.activity_logs.length === new_record.activity_logs.length) {
                  return Response.json({
                    success: true,
                    message: "Activity logs were not updated."
                  });
                }

                const user_id = new_record.activity_logs[new_record.activity_logs.length - 1].user_id;

                const { error } = await supabase.rpc(
                    "increment_assignment_log_notifications",
                    {
                        p_task_id: new_record.id,
                        p_user_id: user_id,
                        p_amount: new_record.activity_logs.length - old_record.activity_logs.length
                    }
                );

                if (error) {
                    throw error;
                }

                return Response.json({
                    success: true,
                    message: "Notifications for task with ID " + new_record.id + " incremented."
                });

            } catch (error) {
                console.error("Edge Function error:", error);

                return Response.json(
                    { error: "Failed to broadcast task deletion" },
                    { status: 500 }
                );
            }
        }
    )
};
