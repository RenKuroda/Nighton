import { User, Status, Scope } from './types';

// FIX: Update MOCK_USERS to include `availableFrom` property.
export const MOCK_USERS: User[] = [
  { id: '1', name: 'Takuya S.', avatarUrl: 'https://picsum.photos/seed/user1/100', status: Status.FREE, community: 'Work Colleagues', relationScope: Scope.PRIVATE, message: 'Just finished up work!', availableFrom: '19:30', lastLoginAt: new Date().toISOString() },
  { id: '2', name: 'Yuki K.', avatarUrl: 'https://picsum.photos/seed/user2/100', status: Status.FREE, community: 'Daddy Friends', relationScope: Scope.COMMUNITY, availableFrom: '21:00', lastLoginAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', name: 'Kenji Tanaka', avatarUrl: 'https://picsum.photos/seed/user3/100', status: Status.BUSY, community: 'Work Colleagues', relationScope: Scope.COMMUNITY, lastLoginAt: new Date(Date.now() - 2*86400000).toISOString() },
  { id: '4', name: 'Emi Ito', avatarUrl: 'https://picsum.photos/seed/user4/100', status: Status.FREE, community: 'Startup CEOs', relationScope: Scope.PUBLIC, message: 'Grabbing a coffee nearby.', availableFrom: '20:00', lastLoginAt: new Date().toISOString() },
  { id: '5', name: 'Ryo Suzuki', avatarUrl: 'https://picsum.photos/seed/user5/100', status: Status.UNSET, community: 'Daddy Friends', relationScope: Scope.PRIVATE, lastLoginAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '6', name: 'Haruka M.', avatarUrl: 'https://picsum.photos/seed/user6/100', status: Status.FREE, community: 'Work Colleagues', relationScope: Scope.COMMUNITY, availableFrom: '19:00', lastLoginAt: new Date().toISOString() },
  { id: '7', name: 'Daiki Sato', avatarUrl: 'https://picsum.photos/seed/user7/100', status: Status.FREE, community: 'Startup CEOs', relationScope: Scope.PUBLIC, availableFrom: '22:00', lastLoginAt: new Date(Date.now() - 2*86400000).toISOString() },
  { id: '8', name: 'Mei Watanabe', avatarUrl: 'https://picsum.photos/seed/user8/100', status: Status.BUSY, community: 'Startup CEOs', relationScope: Scope.PUBLIC, lastLoginAt: new Date().toISOString() },
  { id: '9', name: 'Shota N.', avatarUrl: 'https://picsum.photos/seed/user9/100', status: Status.FREE, community: 'Daddy Friends', relationScope: Scope.COMMUNITY, availableFrom: '20:30', lastLoginAt: new Date().toISOString() },
  { id: '10', name: 'Airi Yamamoto', avatarUrl: 'https://picsum.photos/seed/user10/100', status: Status.FREE, community: 'Nearby People', relationScope: Scope.PUBLIC, availableFrom: '19:00', lastLoginAt: new Date(Date.now() - 86400000).toISOString() },
];

export const SCOPE_LABELS: Record<Scope, string> = {
  [Scope.PRIVATE]: '近しい友人',
  [Scope.COMMUNITY]: '友人',
  [Scope.PUBLIC]: '知人',
};
