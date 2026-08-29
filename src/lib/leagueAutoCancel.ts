import { db } from './firebase';
import { 
  doc, 
  collection, 
  getDocs, 
  query, 
  where, 
  runTransaction, 
  serverTimestamp, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { ProHostedLeague } from '../types';
import { getHoursUntilOpeningMatch } from './dateUtils';

/**
 * Checks an approved league's wallet balance against its required total prize pool.
 * If wallet balance < prize pool AND time is <= 1 hour before opening match:
 * - Auto cancels the league
 * - Deducts 50% of the host security deposit as penalty
 * - Refunds 100% of entry fees paid by registered squad captains
 * - Distributes the 50% host deposit penalty equally among joined squad captains
 * - Notifies all affected users
 */
export async function checkAndCancelUnderfundedLeague(league: ProHostedLeague): Promise<{ cancelled: boolean; message?: string }> {
  // Only check approved / registration phase leagues
  if (league.status !== 'approved') {
    return { cancelled: false };
  }

  const walletBalance = Number(league.walletBalance) || 0;
  const totalPrizePool = Number(league.prizePool) || 0;

  // RULE: If wallet balance >= prize pool, league continues! No cancellation needed.
  if (walletBalance >= totalPrizePool) {
    return { cancelled: false };
  }

  // Calculate hours remaining until opening match
  const hoursRemaining = getHoursUntilOpeningMatch(league.openingMatchDate, league.openingMatchTime);
  if (hoursRemaining === null) {
    return { cancelled: false };
  }

  // Check 2-hour warning trigger
  if (hoursRemaining <= 2.0 && hoursRemaining > 1.0 && !league.warned2Hour) {
    try {
      // Mark warned2Hour on league
      await updateDoc(doc(db, 'pro_hosted_leagues', league.id), { warned2Hour: true });

      // Send warning notification to Host
      const minutesLeft = Math.round(hoursRemaining * 60);
      const notifHostRef = doc(collection(db, 'users', league.hostId, 'notifications'));
      await setDoc(notifHostRef, {
        title: '⚠️ League Wallet Underfunded Alert',
        message: `Your league "${league.leagueName}" opening match is in ${minutesLeft} minutes. Wallet balance (🪙${walletBalance}) is below Prize Pool target (🪙${totalPrizePool}). If not funded or filled in 1 hour, the league will be auto-cancelled with a 50% deposit deduction penalty.`,
        type: 'warning',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error sending 2-hour warning notification:', e);
    }
  }

  // RULE: Auto-cancel 1 hour before opening match (hoursRemaining <= 1.0)
  if (hoursRemaining <= 1.0) {
    try {
      // 1. Fetch squads outside transaction
      const squadsQuery = query(
        collection(db, 'pro_league_squads'),
        where('leagueId', '==', league.id)
      );
      const squadsSnap = await getDocs(squadsQuery);
      const squads = squadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const squadsCount = squads.length;

      const captainIds = Array.from(new Set(squads.map((s: any) => s.leaderId || s.userId).filter(Boolean))) as string[];

      // Host Security Deposit is 10% of total prize pool (or host's initial deposit)
      const hostSecurityDeposit = Number(league.walletTokens) || Math.round(totalPrizePool * 0.1);
      const totalPenaltyDeducted = Math.round(hostSecurityDeposit * 0.5); // 50% of host security deposit cut

      // Bonus split per joined squad captain
      const bonusPerCap = squadsCount > 0 ? Math.floor(totalPenaltyDeducted / squadsCount) : 0;
      const totalRefundPerCap = (Number(league.entryFee) || 0) + bonusPerCap;

      await runTransaction(db, async (transaction) => {
        const proLeagueRef = doc(db, 'pro_hosted_leagues', league.id);
        const upazilaRef = doc(db, 'upazila_leagues', league.id);
        const hostRef = doc(db, 'users', league.hostId);

        // --- READ PHASE (ALL transaction.get calls MUST be here) ---
        const proSnap = await transaction.get(proLeagueRef);
        if (!proSnap.exists()) return;
        const currentData = proSnap.data();
        if (currentData.status === 'cancelled' || currentData.status === 'ongoing' || currentData.status === 'completed') {
          return; // Already processed
        }

        const upazilaSnap = await transaction.get(upazilaRef);
        const hostSnap = await transaction.get(hostRef);

        const captainSnaps = new Map<string, any>();
        for (const capId of captainIds) {
          const capRef = doc(db, 'users', capId);
          const capSnap = await transaction.get(capRef);
          captainSnaps.set(capId, capSnap);
        }

        // --- WRITE PHASE (ALL transaction.update / transaction.set calls MUST be here) ---
        const cancelPayload = {
          status: 'cancelled' as const,
          cancelledAt: new Date().toISOString(),
          cancellationReason: `Auto-cancelled: League Wallet balance (🪙${walletBalance}) was below total Prize Pool requirement (🪙${totalPrizePool}) 1 hour before opening match.`,
          hostPenaltyDeducted: totalPenaltyDeducted,
          squadRefundPerCap: totalRefundPerCap,
          updatedAt: new Date().toISOString()
        };

        transaction.update(proLeagueRef, cancelPayload);

        if (upazilaSnap.exists()) {
          transaction.update(upazilaRef, cancelPayload);
        }

        // Process squad captains refunds & bonuses
        for (const squad of squads as any[]) {
          const captainId = squad.leaderId || squad.userId;
          if (captainId) {
            const capSnap = captainSnaps.get(captainId);
            if (capSnap && capSnap.exists()) {
              const currentTokens = Number(capSnap.data().tokens) || 0;
              const capRef = doc(db, 'users', captainId);
              transaction.update(capRef, {
                tokens: currentTokens + totalRefundPerCap,
                updatedAt: new Date().toISOString()
              });

              // Add notification for captain
              const notifCapRef = doc(collection(db, 'users', captainId, 'notifications'));
              transaction.set(notifCapRef, {
                title: '🚨 League Auto-Cancelled & Refund Awarded',
                message: `League "${league.leagueName}" was auto-cancelled because the wallet did not reach the prize pool target. You received a full entry fee refund (🪙${league.entryFee}) + compensation bonus (🪙${bonusPerCap}) directly to your wallet!`,
                type: 'success',
                createdAt: new Date().toISOString()
              });

              // Add token history log
              const histRef = doc(collection(db, 'users', captainId, 'tokenTransactions'));
              transaction.set(histRef, {
                amount: totalRefundPerCap,
                type: 'income',
                category: 'league_refund',
                title: 'League Refund & Compensation',
                description: `Auto-cancellation refund & compensation for "${league.leagueName}"`,
                createdAt: serverTimestamp(),
                timestamp: Date.now()
              });
            }
          }
        }

        // Deduct host penalty and notify host
        if (hostSnap.exists()) {
          const currentHostTokens = Number(hostSnap.data().tokens) || 0;
          const updatedHostTokens = Math.max(0, currentHostTokens - totalPenaltyDeducted);
          transaction.update(hostRef, {
            tokens: updatedHostTokens,
            updatedAt: new Date().toISOString()
          });

          // Host notification
          const hostNotifRef = doc(collection(db, 'users', league.hostId, 'notifications'));
          transaction.set(hostNotifRef, {
            title: '❌ League Auto-Cancelled & Penalty Deducted',
            message: `Your league "${league.leagueName}" was auto-cancelled 1 hour before opening match because the League Wallet (🪙${walletBalance}) did not meet the total Prize Pool (🪙${totalPrizePool}). 50% of your security deposit (🪙${totalPenaltyDeducted}) was deducted and distributed as compensation to registered captains.`,
            type: 'error',
            createdAt: serverTimestamp()
          });

          // Host token history
          const hostHistRef = doc(collection(db, 'users', league.hostId, 'tokenTransactions'));
          transaction.set(hostHistRef, {
            amount: totalPenaltyDeducted,
            type: 'expense',
            category: 'league_penalty',
            title: 'League Cancel Penalty',
            description: `50% Security deposit penalty for auto-cancelled underfunded league "${league.leagueName}"`,
            createdAt: serverTimestamp(),
            timestamp: Date.now()
          });
        }
      });

      return {
        cancelled: true,
        message: `League "${league.leagueName}" was auto-cancelled because the wallet balance (🪙${walletBalance}) was below total Prize Pool (🪙${totalPrizePool}) 1 hour before opening match. 50% host deposit (🪙${totalPenaltyDeducted}) was distributed to ${squadsCount} joined squad(s).`
      };
    } catch (err: any) {
      console.error('Error auto-cancelling underfunded league:', err);
      return { cancelled: false, message: err?.message };
    }
  }

  return { cancelled: false };
}
