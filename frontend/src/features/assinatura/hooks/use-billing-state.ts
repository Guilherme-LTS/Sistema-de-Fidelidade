import { UsuarioPerfil } from "@/lib/api/types";

export type BillingStatus = 
  | "trial_active"    // In trial, NO subscription scheduled
  | "trial_scheduled" // In trial, WITH a subscription scheduled for after trial ends
  | "trial_canceled"  // In trial, WITH a canceled scheduled subscription
  | "active"          // Subscription active, charging normally
  | "canceled"        // Subscription active but will cancel at period end
  | "past_due"        // Payment pending / declined
  | "expired"         // Trial ended with no subscription, or subscription fully canceled/expired

export interface BillingState {
  status: BillingStatus;
  isTrial: boolean;
  isPro: boolean;
  isLocked: boolean;
  willCancelAtPeriodEnd: boolean;
  trialDaysLeft: number;
}

export function useBillingState(user: UsuarioPerfil | null): BillingState {
  if (!user) {
    return {
      status: "expired",
      isTrial: false,
      isPro: false,
      isLocked: true,
      willCancelAtPeriodEnd: false,
      trialDaysLeft: 0,
    };
  }

  const {
    subscription_status: status,
    subscription_price_id: priceId,
    cancel_at_period_end: cancelAtPeriodEnd,
    subscription_current_period_end: currentPeriodEnd,
  } = user;

  let computedStatus: BillingStatus = "expired";
  let isTrial = false;
  let isPro = false;
  let isLocked = false;
  let trialDaysLeft = 0;

  // Calculate days left for trial or current period
  if (currentPeriodEnd) {
    const end = new Date(currentPeriodEnd).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    trialDaysLeft = Math.max(0, diffDays);
  }

  if (status === "trialing") {
    isTrial = true;
    if (priceId && cancelAtPeriodEnd) {
      computedStatus = "trial_canceled";
    } else if (priceId && !cancelAtPeriodEnd) {
      computedStatus = "trial_scheduled";
    } else {
      computedStatus = "trial_active";
    }
    // No nosso sistema, Trial dá acesso às funcionalidades Pro, mas comercialmente o usuário não é "Pro" ainda.
    isPro = false;
  } else if (status === "active") {
    isPro = true;
    if (cancelAtPeriodEnd) {
      computedStatus = "canceled";
    } else {
      computedStatus = "active";
    }
  } else if (status === "past_due" || status === "unpaid") {
    computedStatus = "past_due";
    isLocked = true;
  } else if (status === "canceled") {
    computedStatus = "expired";
    isLocked = true;
  } else if (!status || status === "incomplete" || status === "incomplete_expired") {
    // Falta de status e plan_name "Bloqueado" ou sem status
    computedStatus = "expired";
    isLocked = true;
  }

  // Fallback de bloqueio por data
  if (computedStatus === "trial_active" && trialDaysLeft === 0) {
    // Technically Stripe handles trial expiry and changes status, but if webhook is delayed:
    computedStatus = "expired";
    isLocked = true;
  }

  return {
    status: computedStatus,
    isTrial,
    isPro,
    isLocked,
    willCancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
    trialDaysLeft,
  };
}
