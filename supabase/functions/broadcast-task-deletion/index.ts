
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

                const task_id = payload.old_record?.id;
                const project_id = payload.old_record?.project_id;

                if (!task_id || !project_id) {
                    return Response.json(
                        { error: "Invalid task deletion payload" },
                        { status: 400 }
                    );
                }

                const channel = supabase.channel(`project-${project_id}`);

                const response = await channel.httpSend(
                    "task_deleted",
                    {
                        task_id
                    }
                );

                console.log("Broadcast response:", response);

                if (!response.success) {
                    throw new Error(
                        `Broadcast failed: ${JSON.stringify(response)}`
                    );
                }

                return Response.json({
                    success: true,
                    task_id,
                    project_id
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
