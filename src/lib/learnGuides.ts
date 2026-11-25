export type GuideCategory =
  | 'All Guides'
  | 'UPI & Payments'
  | 'Phishing & Links'
  | 'Impersonation & KYC'
  | 'Jobs & Offers'
  | 'Account Recovery';

export interface SafetyGuide {
  id: string;
  category: Exclude<GuideCategory, 'All Guides'>;
  title: string;
  readTime: string;
  summary: string;
  howItWorks: string;
  redFlags: string[];
  checklist: string[];
  officialAction: string;
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  'All Guides',
  'UPI & Payments',
  'Phishing & Links',
  'Impersonation & KYC',
  'Jobs & Offers',
  'Account Recovery',
];

export const SAFETY_GUIDES: SafetyGuide[] = [
  {
    id: 'upi-collect-qr',
    category: 'UPI & Payments',
    title: 'Fake UPI Collect Requests & QR Code Scams',
    readTime: '3 min read',
    summary:
      'Understanding why receiving money on UPI never requires entering a PIN or scanning a payment QR code.',
    howItWorks:
      'A scammer pretending to be a marketplace buyer, hotel refund desk, or customer support agent sends a UPI "Collect / Request Money" prompt or QR code while claiming it will credit funds into your account.',
    redFlags: [
      'A buyer asks you to "accept" a notification or scan a QR code to receive an advance.',
      'The screen shows "Pay" or asks for your 4- or 6-digit UPI PIN.',
      'The caller keeps you on live voice call and rushes you so you miss the debit wording.',
    ],
    checklist: [
      'Remember the single rule: UPI PIN is only for sending money, never receiving.',
      'Read the top banner of every UPI prompt carefully—verify whether it says "Requesting money from you".',
      'Reject unknown collect requests and block the VPA/handle inside your UPI app.',
      'Check actual bank credit in your official bank passbook, not a WhatsApp screenshot.',
    ],
    officialAction:
      'If a debit happens, call 1930 immediately, raise a dispute in your UPI app, and report on cybercrime.gov.in.',
  },
  {
    id: 'kyc-bank-impersonation',
    category: 'Impersonation & KYC',
    title: 'KYC Expiry, Electricity Disconnection & Bank Impersonation',
    readTime: '4 min read',
    summary:
      'How urgency-driven SMS and WhatsApp notices imitate banks, telecom operators, and utilities.',
    howItWorks:
      'Messages warn that your bank account, PAN link, SIM card, or electricity connection will be suspended within hours unless you click a lookalike link or call an unverified mobile number.',
    redFlags: [
      'Personal 10-digit mobile numbers listed as "customer care" inside an SMS.',
      'Short deadlines like "blocked in 2 hours" or "suspended tonight at 9:30 PM".',
      'Requests to install an APK file or screen-sharing app such as AnyDesk or QuickSupport.',
    ],
    checklist: [
      'Never call mobile numbers written inside unexpected warning messages.',
      'Verify KYC status solely inside your official bank mobile app or at a physical branch.',
      'Refuse any request to install remote-access tools or `.apk` files sent over chat.',
      'Report suspicious numbers and messages on Sanchar Saathi Chakshu.',
    ],
    officialAction:
      'Report suspected fraud calls and SMS via https://sancharsaathi.gov.in/sfc/ (Chakshu).',
  },
  {
    id: 'phishing-links',
    category: 'Phishing & Links',
    title: 'Phishing Links, Lookalike Domains & Parcel Fee Traps',
    readTime: '3 min read',
    summary:
      'Inspecting URLs carefully before logging in, entering card details, or paying small "redelivery" fees.',
    howItWorks:
      'Attackers register domains that closely resemble Indian banks, courier services, or government portals (often ending in `.xyz`, `.top`, or hyphenated subdomains) to steal credentials or card OTPs.',
    redFlags: [
      'Domain uses hyphens and extra words (e.g., `indiapost-parcel-clearance.top` instead of `indiapost.gov.in`).',
      'Link arrives via URL shorteners (`bit.ly`, `tinyurl`) for sensitive banking or customs actions.',
      'Small urgent fee (Rs 15 to Rs 50) asked to "unlock" a parcel, which actually captures card details.',
    ],
    checklist: [
      'Check the root domain right before the first `/` — not just the brand name at the start.',
      'Look for official `.gov.in` or verified bank domain endings before entering any information.',
      'Navigate by typing the known address or using your saved bookmark instead of tapping chat links.',
      'Never assume a green padlock (`https://`) means the site belongs to a real company.',
    ],
    officialAction:
      'If card details were entered on a lookalike site, lock your card immediately in your banking app and call 1930 if unauthorized charges occur.',
  },
  {
    id: 'fake-job-offers',
    category: 'Jobs & Offers',
    title: 'Fraudulent Part-Time Jobs & Prepaid Task Scams',
    readTime: '4 min read',
    summary:
      'Recognizing WhatsApp and Telegram recruitment lures that escalate from small rewards to trapped deposits.',
    howItWorks:
      'Unverified recruiters offer Rs 2,000–Rs 6,000 daily for simple tasks (liking videos, rating hotels). After paying one or two small test rewards to build trust, they require "prepaid merchant tasks" to unlock larger earnings.',
    redFlags: [
      'Unsolicited job offers arriving via WhatsApp or Telegram without an interview.',
      'High daily pay for zero specialized skills.',
      'Requirement to deposit money ("security fee", "welfare task", "tax") to withdraw your own balance.',
    ],
    checklist: [
      'Verify any recruiter’s identity via the company’s official careers page and corporate email domain.',
      'Walk away immediately if any job asks you to transfer money or buy crypto to unlock tasks.',
      'Do not send additional money to "recover" funds already stuck in a task dashboard.',
      'Save all Telegram usernames, UPI IDs, and bank transfer UTR numbers.',
    ],
    officialAction:
      'Report financial task scams promptly at 1930 and https://cybercrime.gov.in with UTR details.',
  },
  {
    id: 'digital-arrest-impersonation',
    category: 'Impersonation & KYC',
    title: 'Fake Police, Courier & "Digital Arrest" Video Call Scams',
    readTime: '4 min read',
    summary:
      'Why Indian law enforcement never conducts video-call interrogations or demands "verification transfers".',
    howItWorks:
      'Callers posing as courier staff, narcotics officers, CBI, or cyber police claim an illegal parcel was booked in your Aadhaar number and pressure you to stay on Skype/WhatsApp video and transfer money to an "RBI safe account".',
    redFlags: [
      'Claims that you are under "digital arrest" and forbidden from hanging up or speaking to family.',
      'Video calls showing scripted rooms with uniforms or forged court notices sent over WhatsApp.',
      'Instructions to transfer savings to a "government verification account" for clearance.',
    ],
    checklist: [
      'Know that "digital arrest" does not exist in Indian law—police do not interrogate or clear accounts via video call.',
      'Hang up immediately if a caller isolates you and demands secrecy or money transfers.',
      'Verify independently by visiting your local police station or calling 112 / 1930.',
      'Alert a trusted family member before making any financial move under pressure.',
    ],
    officialAction:
      'Disconnect the call and report the impersonation attempt on 1930 or cybercrime.gov.in.',
  },
  {
    id: 'account-protection-recovery',
    category: 'Account Recovery',
    title: 'Account Hardening & What to Do After Clicking a Suspicious Link',
    readTime: '3 min read',
    summary:
      'A calm, ordered response checklist for securing your phone, UPI, email, and bank accounts.',
    howItWorks:
      'Whether you tapped a suspicious link by mistake or noticed unusual login alerts, acting in the right order limits exposure without panic.',
    redFlags: [
      'Unexpected OTP SMS messages you did not request.',
      'New unknown apps appearing in your phone app drawer or Accessibility settings.',
      'Sudden loss of mobile SIM network signal (possible SIM-swap attempt).',
    ],
    checklist: [
      'Check if an unknown `.apk` or screen-sharing app was installed; if yes, turn off internet and uninstall it.',
      'Review active WhatsApp Linked Devices and Google/Apple account sessions; sign out unfamiliar devices.',
      'Enable app-based 2FA and separate strong passwords for email and financial accounts.',
      'Set sensible daily UPI and card transaction limits inside your bank app.',
    ],
    officialAction:
      'If SIM signal drops unexpectedly or funds move, contact your telecom provider and bank immediately, and dial 1930.',
  },
];
