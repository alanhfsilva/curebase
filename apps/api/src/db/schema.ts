import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
  check,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const participants = pgTable(
  'participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    age: integer('age').notNull(),
    weight: numeric('weight').notNull(),
    height: numeric('height').notNull(),
    unitSystem: text('unit_system').notNull().default('us'),
    bmi: numeric('bmi', { precision: 6, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('participants_email_unique').on(table.email),
    index('participants_bmi_idx').on(table.bmi),
    index('participants_created_at_id_idx').on(
      sql`${table.createdAt} DESC`,
      sql`${table.id} DESC`,
    ),
    check('unit_system_check', sql`${table.unitSystem} IN ('us', 'metric')`),
    check('age_check', sql`${table.age} >= 0 AND ${table.age} <= 120`),
    check('weight_check', sql`${table.weight} > 0`),
    check('height_check', sql`${table.height} > 0`),
    check('bmi_check', sql`${table.bmi} > 0`),
  ],
);
