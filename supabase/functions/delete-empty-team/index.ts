
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
                const team_id = payload.old_record.team_id;

                const { data: member_data, error: member_error } =
                    await supabase
                        .from("members")
                        .select("user_id")
                        .eq("team_id", team_id);

                if (member_error) {
                    throw member_error;
                }

                if (member_data.length > 0) {
                    return Response.json({
                        success: true,
                        message: "Team still has members."
                    });
                }

                const { data: projects_data, error: projects_error } = await supabase
                    .from("projects")
                    .select("*")
                    .eq("team_id", team_id);
                
                if (projects_error) {
                    throw projects_error;
                }

                const project_ids = projects_data.map(project => project.id);

                const { data: tasks_data, error: tasks_error } = await supabase
                    .from("tasks")
                    .select("*")
                    .in("project_id", project_ids);
                
                if (tasks_error) {
                    throw tasks_error;
                }

                const task_ids = tasks_data.map(task => task.id);

                const { error: comments_error } = await supabase
                    .from("comments")
                    .delete()
                    .in("task_id", task_ids);
                
                if (comments_error) {
                    throw comments_error;
                }

                const { error: assignments_error } = await supabase
                    .from("assignments")
                    .delete()
                    .eq("team_id", team_id);
                
                if (assignments_error) {
                    throw assignments_error;
                }

                const { error: task_delete_error } = await supabase
                    .from("tasks")
                    .delete()
                    .in("id", task_ids);
                
                if (task_delete_error) {
                    throw task_delete_error;
                }

                const { error: project_delete_error } = await supabase
                    .from("projects")
                    .delete()
                    .eq("team_id", team_id);

                if (project_delete_error) {
                    throw project_delete_error;
                }

                const { error: team_error } = await supabase
                    .from("teams")
                    .delete()
                    .eq("team_id", team_id);

                if (team_error) {
                    throw team_error;
                }

                return Response.json({
                    success: true,
                    message: `Team ${team_id} cleanup completed.`
                });

            } catch (error) {
                console.error("Webhook error:", error);

                return Response.json(
                    { error: "Internal server error" },
                    { status: 500 }
                );
            }
        }
    )
};
