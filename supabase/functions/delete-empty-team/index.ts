
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

                // IMPORTANT TODO: Delete dependent entries safely.

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
