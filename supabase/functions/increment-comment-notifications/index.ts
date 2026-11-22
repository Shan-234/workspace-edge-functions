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

                const { error } = await supabase.rpc(
                  "increment_assignment_comment_notifications",
                  {
                    p_task_id: new_record.task_id,
                    p_sender_id: new_record.creator_id,
                    p_amount: 1
                  }
                );

                if (error) {
                  throw error;
                }

                return Response.json({
                    success: true,
                    message: "Comment notifications for task with ID " + new_record.task_id + " incremented."
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
