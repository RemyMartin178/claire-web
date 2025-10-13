import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { auth } from './firebaseAdmin';
import { getApps } from 'firebase-admin/app';

export interface StripeSubscriptionData {
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  plan: 'free' | 'plus' | 'enterprise';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date;
}

export class StripeAdminService {
  private static get db() {
    if (getApps().length === 0) {
      throw new Error('Firebase Admin not initialized');
    }
    return getFirestore();
  }

  /**
   * Update user subscription in Firestore (called by webhooks)
   */
  static async updateUserSubscription(
    userId: string, 
    subscriptionData: StripeSubscriptionData
  ): Promise<void> {
    try {
      console.log('StripeAdminService: Updating subscription for user:', userId, subscriptionData);
      
      const userRef = this.db.collection('users').doc(userId);
      
      // Convert dates to Firestore Timestamps
      const firestoreData = {
        ...subscriptionData,
        currentPeriodStart: subscriptionData.currentPeriodStart ? 
          FieldValue.serverTimestamp() : undefined,
        currentPeriodEnd: subscriptionData.currentPeriodEnd ? 
          FieldValue.serverTimestamp() : undefined,
        trialEnd: subscriptionData.trialEnd ? 
          FieldValue.serverTimestamp() : undefined,
        updatedAt: FieldValue.serverTimestamp()
      };

      // Remove undefined values
      Object.keys(firestoreData).forEach(key => {
        if ((firestoreData as any)[key] === undefined) {
          delete (firestoreData as any)[key];
        }
      });

      await userRef.update({
        subscription: firestoreData
      });

      console.log('StripeAdminService: Subscription updated successfully for user:', userId);
    } catch (error: any) {
      console.error('StripeAdminService: Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Get user subscription from Firestore
   */
  static async getUserSubscription(userId: string): Promise<StripeSubscriptionData | null> {
    try {
      console.log('StripeAdminService: Getting subscription for user:', userId);
      
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.log('StripeAdminService: User not found:', userId);
        return null;
      }
      
      const userData = userDoc.data();
      const subscription = userData?.subscription;
      
      if (!subscription) {
        console.log('StripeAdminService: No subscription found for user:', userId);
        return null;
      }

      console.log('StripeAdminService: Subscription found:', subscription);
      return subscription as StripeSubscriptionData;
    } catch (error: any) {
      console.error('StripeAdminService: Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Cancel user subscription (set to free plan)
   */
  static async cancelUserSubscription(userId: string): Promise<void> {
    try {
      console.log('StripeAdminService: Canceling subscription for user:', userId);
      
      await this.updateUserSubscription(userId, {
        status: 'canceled',
        plan: 'free'
      });

      console.log('StripeAdminService: Subscription canceled successfully for user:', userId);
    } catch (error: any) {
      console.error('StripeAdminService: Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Check if user has active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return false;
      }

      // Check if subscription is active and not canceled
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      const isNotCanceled = !subscription.cancelAtPeriodEnd;
      
      return isActive && isNotCanceled;
    } catch (error: any) {
      console.error('StripeAdminService: Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Get subscription plan type
   */
  static async getSubscriptionPlan(userId: string): Promise<'free' | 'plus' | 'enterprise'> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || !await this.hasActiveSubscription(userId)) {
        return 'free';
      }

      return subscription.plan;
    } catch (error: any) {
      console.error('StripeAdminService: Error getting plan:', error);
      return 'free';
    }
  }
}
