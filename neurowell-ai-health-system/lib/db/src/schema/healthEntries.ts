import { pgTable, serial, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const healthEntriesTable = pgTable("health_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  sleep: real("sleep").notNull().default(0),
  water: real("water").notNull().default(0),
  activity: integer("activity").notNull().default(0),
  mood: integer("mood").notNull().default(5),
  stress: integer("stress").notNull().default(5),
  energy: integer("energy").notNull().default(5),
  heartRate: integer("heart_rate").notNull().default(72),
  weight: real("weight").notNull().default(70),
  symptoms: jsonb("symptoms").notNull().default([]).$type<string[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHealthEntrySchema = createInsertSchema(healthEntriesTable).omit({
  id: true,
  createdAt: true,
}).extend({
  symptoms: z.array(z.string()).optional().default([]),
});

export type InsertHealthEntry = z.infer<typeof insertHealthEntrySchema>;
export type HealthEntry = typeof healthEntriesTable.$inferSelect;
