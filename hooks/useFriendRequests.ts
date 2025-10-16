import { supabase } from '../utils/supabase';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type Relationship = 'acquaintance' | 'friend' | 'close_friend' | null;

export type FriendRequest = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  relationship: Relationship;
  created_at: string;
  updated_at: string;
};

export function useFriendRequests(currentAccountId?: string) {
  async function sendRequest({ requesterId, receiverId }: { requesterId: string; receiverId: string; }) {
    // prevent duplicates (pending/accepted) including reverse-direction requests
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('id,status,requester_id,receiver_id,updated_at')
      .or(
        `and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`
      )
      .order('updated_at', { ascending: false });
    const pendAcc = (existing || []).find(r => (r.status === 'pending' || r.status === 'accepted'));
    if (pendAcc) {
      const st = pendAcc.status as FriendRequestStatus;
      throw new Error(st === 'accepted' ? 'すでにフレンドです' : 'この相手には申請済みです');
    }
    const rejected = (existing || []).find(r => r.status === 'rejected');
    if (rejected) {
      // 受信者側の履歴は保持。申請者側には詳細を知らせない。
      throw new Error('この相手には申請済みです');
    }
    const cancelled = (existing || []).find(r => r.status === 'cancelled' && r.requester_id === requesterId && r.receiver_id === receiverId);
    if (cancelled) {
      const { data, error } = await supabase
        .from('friend_requests')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', cancelled.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as FriendRequest;
    }
    const id = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : Math.random().toString(36).slice(2);
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({ id, requester_id: requesterId, receiver_id: receiverId, status: 'pending' })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as FriendRequest;
  }

  async function cancelRequest(id: string) {
    const { error } = await supabase.from('friend_requests').update({ status: 'cancelled' }).eq('id', id);
    if (error) throw error;
  }

  async function approveRequest(id: string, relationship: Relationship) {
    const { error } = await supabase.from('friend_requests').update({ status: 'accepted', relationship }).eq('id', id);
    if (error) throw error;
  }

  async function rejectRequest(id: string) {
    const { error } = await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) throw error;
  }

  async function getSentPending(requesterId: string) {
    // 送信者側では拒否済みも一覧に残す（再申請や状況把握のため）
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('requester_id', requesterId)
      .in('status', ['pending', 'rejected'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as FriendRequest[];
  }

  async function getReceivedPending(receiverId: string) {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as FriendRequest[];
  }

  async function getRejected(receiverId: string) {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', receiverId)
      .eq('status', 'rejected')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data as FriendRequest[];
  }

  return { sendRequest, cancelRequest, approveRequest, rejectRequest, getSentPending, getReceivedPending, getRejected };
}


