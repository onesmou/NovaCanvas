import { randomUUID } from 'node:crypto';
import { db, ensureSelfHostedSchema } from './selfhost-db';

export type CreditTransactionType = 'account_created'|'admin_adjustment'|'generation_reserve'|'generation_refund'|'edit_reserve'|'edit_refund';

type ChangeInput = {
  userId: string;
  delta: number;
  type: CreditTransactionType;
  actorId?: string | null;
  assetId?: string | null;
  note?: string | null;
};

export async function changeCredits(input: ChangeInput): Promise<number | null> {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw new Error('积分变动必须是非零整数');
  await ensureSelfHostedSchema();
  return db().begin(async sql => {
    const rows = await sql<Array<{ credits: number }>>`
      UPDATE app_users SET credits=credits+${input.delta}
      WHERE id=${input.userId} AND credits+${input.delta}>=0
      RETURNING credits`;
    if (!rows[0]) return null;
    await sql`
      INSERT INTO credit_transactions(id,user_id,actor_id,asset_id,type,delta,balance_after,note)
      VALUES(${randomUUID()},${input.userId},${input.actorId || null},${input.assetId || null},${input.type},${input.delta},${rows[0].credits},${input.note || null})`;
    return rows[0].credits;
  });
}

export function reserveCredits(input: Omit<ChangeInput, 'delta'> & { amount: number }) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('积分价格必须是正整数');
  return changeCredits({ ...input, delta: -input.amount });
}
