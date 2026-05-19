import { defineSchema } from "convex/server";
import { authTables } from "convex-simple-auth/server";

export default defineSchema({
  ...authTables,
  // your tables here
});
