import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import { and, lte, gte, eq, count, sql, desc } from "drizzle-orm"

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
                id: goalCompletions.id,
                title: goals.title,
                completedAt: goalCompletions.createdAt, 
                completedAtDate: sql`
                    DATE(${goalCompletions.createdAt})
                `.as('completedAtDate')
            })
            .from(goalCompletions)
            .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
            .where(and(
                gte(goalCompletions.createdAt, firstDayOfWeek),
                lte(goalCompletions.createdAt, lastDayOfWeek)

            ))
            .orderBy(desc(goalCompletions.createdAt))
    )

    const goalsCompletedByWeekDay = db.$with('goals_completed_by_week_day').as(
        db
        .select({
            completedAtDate: goalsCompletedWeek.completedAtDate,
            completions: sql /*sql*/`
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', ${goalsCompletedWeek.id},
                        'title', ${goalsCompletedWeek.title},
                        'completedAt', ${goalsCompletedWeek.completedAt}
                    )
                )
            `.as('completions'),
        })
        .from(goalsCompletedWeek)
        .groupBy(goalsCompletedWeek.completedAtDate)
        .orderBy(desc(goalsCompletedWeek.completedAtDate))
        
    )

    type GoalsPerDay = Record<string, {
        id: string,
        title: string,
        completedAt: string
    }[]>

    const result = await db
        .with(goalsCreatedUpToWeek, goalsCompletedWeek, goalsCompletedByWeekDay)
        .select({
            completed: sql/*sql*/`(SELECT COUNT(*) FROM ${goalsCompletedWeek})`.mapWith(Number),
            total: sql/*sql*/`(SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(Number),
            goalsPerDay: sql /*sql*/<GoalsPerDay>`
                JSON_OBJECT_AGG(
                    ${goalsCompletedByWeekDay.completedAtDate},
                    ${goalsCompletedByWeekDay.completions}
                )
            `
        })
        .from(goalsCompletedByWeekDay)

    return {
        summary: result[0]
    }
}