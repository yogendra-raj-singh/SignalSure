export interface AssistantReply {
  answer: string;
  suggestedActions: string[];
}

export const ASSISTANT_QUICK_TOPICS = [
  {
    id: 'clicked-link',
    label: 'I clicked a suspicious link — what should I do now?',
    prompt: 'I clicked a suspicious link in an SMS or WhatsApp message. What steps should I take immediately?',
  },
  {
    id: 'upi-collect',
    label: 'Someone asked me to approve a UPI request to receive money',
    prompt: 'A buyer asked me to approve a UPI collect request or scan a QR code to receive payment. Is that normal?',
  },
  {
    id: 'job-offer',
    label: 'Is this part-time WhatsApp or Telegram task job real?',
    prompt: 'Someone messaged me about a part-time remote job rating hotels or liking videos on Telegram and now asks for a prepaid deposit.',
  },
  {
    id: 'kyc-call',
    label: 'Someone called claiming my bank KYC or SIM is being blocked',
    prompt: 'I got an urgent call or SMS saying my bank KYC or SIM card will be blocked today unless I share details or install an app.',
  },
];

export function getDemoAssistantReply(question: string): AssistantReply {
  const q = question.toLowerCase();

  if (/click|apk|install|anydesk|teamviewer|quicksupport|downloaded/.test(q)) {
    return {
      answer:
        'If you only tapped a link and closed the page without entering details or installing a file, your risk is usually lower—still, stay alert. If you entered credentials, OTPs, or installed an unknown APK / remote-access app (like AnyDesk or QuickSupport), act immediately: disconnect the device from mobile data and Wi-Fi, uninstall the unknown app, and call your bank from a different phone.',
      suggestedActions: [
        'Turn off Wi-Fi and mobile data if you installed an unknown APK or screen-sharing app.',
        'Call your bank using the official number on the back of your card to freeze UPI/cards.',
        'Change passwords and enable 2FA on your email and banking accounts from a clean device.',
        'If money was debited, call 1930 immediately and report at cybercrime.gov.in.',
      ],
    };
  }

  if (/upi|collect|qr|pin|refund|olx|buyer|gpay|phonepe|paytm/.test(q)) {
    return {
      answer:
        'You never need to enter your UPI PIN, approve a "Pay / Collect" request, or scan a QR code to receive money. Entering your UPI PIN always authorizes money leaving your account. Decline the request immediately, block the sender, and avoid sharing screenshots of your UPI ID with unknown buyers.',
      suggestedActions: [
        'Decline and block any UPI collect request claiming to send you a refund or advance.',
        'Check your bank balance independently inside your official UPI or banking app—never trust SMS screenshots.',
        'If you already entered your PIN and money left, call 1930 promptly and lodge a dispute in your UPI app.',
      ],
    };
  }

  if (/job|telegram|task|prepaid|rating|hotel|part-time|youtube|review|salary/.test(q)) {
    return {
      answer:
        'Unsolicited WhatsApp or Telegram offers promising high daily pay for simple clicks, hotel reviews, or video likes—followed by "prepaid welfare tasks" or recharge deposits to unlock withdrawals—follow the classic task-scam playbook. Legitimate employers never ask candidates to deposit money to earn a salary.',
      suggestedActions: [
        'Stop sending money immediately—even if small initial payouts worked earlier.',
        'Do not pay "tax", "verification", or "withdrawal unlock" fees.',
        'Preserve chat screenshots and transaction UTR numbers, then report at cybercrime.gov.in or call 1930.',
      ],
    };
  }

  if (/kyc|sim|trai|sbi|hdfc|icici|pan|blocked|suspended|courier|customs/.test(q)) {
    return {
      answer:
        'Banks, telecom providers, TRAI, and India Post do not threaten sudden 2-hour account or SIM disconnection over personal mobile numbers or unofficial domains. Never call phone numbers pasted inside an urgent SMS or share OTPs for KYC updates.',
      suggestedActions: [
        'Open your official bank app or visit the branch directly to check whether any KYC update is actually due.',
        'Forward/report suspected scam SMS or calls on Sanchar Saathi Chakshu (sancharsaathi.gov.in/sfc/).',
        'Never share Aadhaar/PAN photos or OTPs over WhatsApp calls.',
      ],
    };
  }

  if (/lost money|scammed|debited|fraud|1930|police|complaint/.test(q)) {
    return {
      answer:
        'Time matters most after a financial fraud. In India, reporting quickly helps cyber cells flag and freeze onward bank transfers before funds are withdrawn.',
      suggestedActions: [
        'Call 1930 (National Cyber Crime Helpline) immediately with transaction time, amount, and UTR/reference ID.',
        'File a detailed report on https://cybercrime.gov.in and save your acknowledgement number.',
        'Contact your bank’s official fraud desk to temporarily block compromised cards, netbanking, or UPI.',
      ],
    };
  }

  return {
    answer:
      'I can help you spot common scam patterns in India and walk through calm verification steps. In general, pause whenever a message creates sudden urgency, asks for an OTP or UPI PIN, redirects you to Telegram/WhatsApp, or asks for an upfront fee. Paste suspicious text into the SignalSure Analyzer for a structured check.',
    suggestedActions: [
      'Verify organizations only through their official app, bookmark, or card-back helpline.',
      'Never enter a UPI PIN or share an OTP to receive money or claim a refund.',
      'Use the SignalSure Analyzer to examine specific wording and link red flags.',
    ],
  };
}
