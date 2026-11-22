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
                const transaction_type = payload.type;
                const new_record = payload.record;
                const old_record = payload.old_record;
                const status_map = {
                  "todo": "TO DO",
                  "in_progress": "IN PROGRESS",
                  "in_review": "IN REVIEW",
                  "done": "DONE"
                };
                const today = new Date();

                const { data: user_data, error: user_error } = await supabase
                  .from("accounts")
                  .select("username")
                  .eq("id", new_record.last_updated_by)
                  .single();
                
                if (user_error) {
                  console.log(user_error);
                }

                if (transaction_type === "INSERT") {
                  const new_log = {
                    timestamp: today.toISOString(),
                    topic: "new_task",
                    user_id: new_record.last_updated_by,
                    message: user_data.username + " created task " + new_record.title + "."
                  };

                  new_record.activity_logs.push(new_log);

                  const { error: tasks_error } = await supabase
                    .from("tasks")
                    .update({
                      activity_logs: new_record.activity_logs
                    })
                    .eq("id", new_record.id);
                  
                  if (tasks_error) {
                    console.log(tasks_error);
                  }

                  return Response.json({
                    success: true,
                    message: user_data.username + " created task " + new_record.title + "."
                  });
                }

                const new_logs = [];

                if (new_record.title !== old_record.title) {
                  new_logs.push({
                    timestamp: today.toISOString(),
                    topic: "title",
                    user_id: new_record.last_updated_by,
                    message: user_data.username + "changed the title from " + old_record.title + " to " + new_record.title + "."
                  });
                }

                if (new_record.description !== old_record.description) {
                  new_logs.push({
                    timestamp: today.toISOString(),
                    topic: "description",
                    user_id: new_record.last_updated_by,
                    message: user_data.username + " edited the description of the task."
                  });
                }

                if (new_record.status !== old_record.status) {
                  new_logs.push({
                    timestamp: today.toISOString(),
                    topic: "status",
                    user_id: new_record.last_updated_by,
                    message: user_data.username + " moved task " + new_record.title + ": " + status_map[old_record.status] + " -> " + status_map[new_record.status]
                  });
                }

                if (new_record.due_date !== old_record.due_date) {
                  new_logs.push({
                    timestamp: today.toISOString(),
                    topic: "due_date",
                    user_id: new_record.last_updated_by,
                    message: user_data.username + " changed the due date of the task from " + old_record.due_date + " to " + new_record.due_date + "."
                  });
                }

                if (new_record.priority !== old_record.priority) {
                  new_logs.push({
                    timestamp: today.toISOString(),
                    topic: "priority",
                    user_id: new_record.last_updated_by,
                    message: user_data.username + " changed the priority of this task from " + old_record.priority + " to " + new_record.priority + "."
                  });
                }

                if (new_logs.length === 0) {
                  return Response.json({
                    success: true,
                    message: "No updates were made to the core attributes of the task."
                  });
                }

                for (let i = 0; i < new_logs.length; i++) {
                  new_record.activity_logs.push(new_logs[i]);
                }

                const { error: tasks_error } = await supabase
                  .from("tasks")
                  .update({
                    activity_logs: new_record.activity_logs
                  })
                  .eq("id", new_record.id);
                
                if (tasks_error) {
                  console.log(tasks_error);
                }
                
                return Response.json({
                  success: true,
                  message: new_logs
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