import { title } from 'process';
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import { and, lte, gte, eq, count, sql } from "drizzle-orm"

dayjs.extend(weekOfYear)

export async function getWeekSummary(){
    const firstDayOfWeek = dayjs().startOf('week').toDate()
    const lastDayOfWeek = dayjs().endOf('week').toDate()

    const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
        db
            .select({
                id: goals.id,
                title: goals.title,
                desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
                createdAt: goals.createdAt,
            })
            .from(goals)
            .where(lte(goals.createdAt, lastDayOfWeek))
    )

    const goalsCompletedWeek = db.$with('goals_completed_week').as(
        db
            .select({
                goalId: goalCompletions.goalId,
                completionCount: count(goalCompletions.id).as('completionCount'),
            })
            .from(goalCompletions)
            .innerJoin(goals, eq(goals.id, ))
            .where(and(
                gte(goalCompletions.createdAt, firstDayOfWeek),
                lte(goalCompletions.createdAt, lastDayOfWeek)

            ))
            .groupBy(goalCompletions.goalId)
    )

    return {
        summary: 'test'
    }
}