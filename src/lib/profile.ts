import type { FamilyProfile } from '../../shared/types';

const KEY = 'tuck.profile.v1';

export const DEFAULT_PROFILE: FamilyProfile = {
  parentName: '',
  parentTitle: '',
  childName: '',
  childAge: 3,
  voiceId: null,
  avatar: { skinTone: '#d9a066', hairStyle: 'short', hairColor: '#3b2a20', glasses: false, beard: false },
};

export function loadProfile(): FamilyProfile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: FamilyProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Private windows can block storage; the app still works for this visit.
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // See saveProfile.
  }
}
