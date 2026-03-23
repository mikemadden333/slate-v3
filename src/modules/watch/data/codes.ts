export interface EmergencyCode {
  code: string;
  name: string;
  color: string;
  bgColor: string;
  description: string;
  paScript: string;
  steps: string[];
}

export const EMERGENCY_CODES: EmergencyCode[] = [
  {
    code: 'RED',
    name: 'Code Red — Lockdown',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    description: 'Active threat on or immediately adjacent to campus. Full lockdown.',
    paScript:
      'Attention all staff and students. We are now in a Code Red lockdown. ' +
      'All students and staff move immediately to your designated secure location. ' +
      'Lock all doors. Turn off lights. Move away from windows. ' +
      'Remain silent. Do not open doors for anyone. ' +
      'Await further instructions from administration or law enforcement.',
    steps: [
      'Announce Code Red over PA system immediately',
      'Call 911 — provide campus address, nature of threat, number of people on campus',
      'Notify Noble Network Safety Director',
      'Ensure all exterior doors are locked — assign staff to verify',
      'Send family notification via ParentSquare (AI-drafted message)',
      'Document all actions with timestamps',
      'Await all-clear from law enforcement before lifting lockdown',
    ],
  },
  {
    code: 'YELLOW',
    name: 'Code Yellow — Heightened Alert',
    color: '#D97706',
    bgColor: '#FFFBEB',
    description: 'Elevated neighborhood risk. Modified operations, heightened security posture.',
    paScript:
      'Attention all staff. We are implementing a Code Yellow. ' +
      'All exterior doors are to remain locked. ' +
      'Security team report to your designated positions. ' +
      'Students remain in classrooms during transitions. ' +
      'Staff, check your email for additional instructions.',
    steps: [
      'Announce Code Yellow over PA system',
      'Lock all exterior doors — verify with security team',
      'Position security staff at primary entrances',
      'Brief office staff on situation — provide talking points for parent inquiries',
      'Send family notification if dismissal will be modified',
      'Notify Noble Network Safety Director',
      'Document all actions with timestamps',
    ],
  },
  {
    code: 'WHITE',
    name: 'Code White — Neptune Protocol',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    description: 'Immigration enforcement activity detected near campus. Protect families.',
    // CRITICAL: This PA script MUST NOT mention ICE, immigration,
    // federal agents, law enforcement, or the nature of the threat.
    // This is a LEGAL and ETHICAL requirement.
    paScript:
      'Attention Noble family. We are implementing a Code White. ' +
      'All students and staff move immediately to your designated secure location. ' +
      'Lock your doors and remain calm and quiet. ' +
      'Await further instructions from administration.',
    steps: [
      'Announce Code White (Neptune) over PA system — use EXACT script above',
      'Lock all exterior doors immediately — do NOT allow entry to anyone without Noble ID',
      'Contact Noble Legal immediately — report situation and await guidance',
      'Notify Noble Network Safety Director and Chief of Culture & Safety',
      'Send family notification — AI-drafted message with ICE prohibition enforced',
      'Activate rapid response network contacts if available',
      'Document all actions with timestamps — do NOT document immigration details in school records',
    ],
  },
  {
    code: 'BLUE',
    name: 'Code Blue — Medical Emergency',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    description: 'Medical emergency requiring immediate response.',
    paScript:
      'Attention staff. We have a Code Blue in [LOCATION]. ' +
      'Designated first aid team report to [LOCATION] immediately. ' +
      'All other staff, please keep hallways clear. ' +
      'Students remain in classrooms.',
    steps: [
      'Call 911 — provide campus address and nature of medical emergency',
      'Announce Code Blue with location over PA',
      'Send first aid / AED team to location',
      'Clear hallways for EMS access',
      'Assign staff member to meet EMS at main entrance',
      'Notify family of affected student/staff',
      'Document all actions with timestamps',
    ],
  },
  {
    code: 'GREEN',
    name: 'Code Green — Evacuation',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    description: 'Building evacuation required — fire, gas leak, structural concern.',
    paScript:
      'Attention all staff and students. We are initiating a Code Green evacuation. ' +
      'All students and staff proceed to your designated evacuation assembly point immediately. ' +
      'Teachers, take your attendance rosters. ' +
      'Do not return to the building until the all-clear is given.',
    steps: [
      'Pull fire alarm or announce Code Green evacuation over PA',
      'Call 911 if not already notified — provide nature of emergency',
      'All classes proceed to designated assembly points with rosters',
      'Teachers take attendance at assembly point — report any missing students immediately',
      'Notify Noble Network Safety Director',
      'Send family notification if evacuation is prolonged',
      'Document all actions with timestamps',
    ],
  },
  {
    code: 'ORANGE',
    name: 'Code Orange — Severe Weather',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    description: 'Severe weather requiring shelter-in-place.',
    paScript:
      'Attention all staff and students. We are implementing a Code Orange. ' +
      'All students and staff move to your designated interior safe rooms immediately. ' +
      'Stay away from windows. ' +
      'Await further instructions from administration.',
    steps: [
      'Monitor weather alerts — confirm threat level',
      'Announce Code Orange over PA system',
      'Move all students and staff to interior rooms away from windows',
      'Account for all students and staff',
      'Notify Noble Network Safety Director',
      'Send family notification about shelter-in-place status',
      'Document all actions with timestamps',
    ],
  },
];
