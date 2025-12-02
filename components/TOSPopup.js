import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Button, useTheme } from "react-native-paper";

const TOSPopup = ({ visible, onAccept, onDecline }) => {
  const theme = useTheme();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }) => {
    const paddingToBottom = 20;
    return (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onDecline}
    >
      <View style={styles.centeredView}>
        <View
          style={[styles.modalView, { backgroundColor: theme.colors.surface }]
        }>
          <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
            Terms of Service
          </Text>
          <ScrollView
            style={styles.tosContainer}
            onScroll={({ nativeEvent }) => {
              if (isCloseToBottom(nativeEvent)) {
                setScrolledToEnd(true);
              }
            }}
            scrollEventThrottle={400}
          >
            <Text style={{ color: theme.colors.onSurface }}>
              Doubly Connections – Terms of Service 

              1. Acceptance of Terms 

              Welcome to Doubly Connections (“Doubly”, “we”, “us”, “our”), a double-dating application for university students. 

              These Terms of Service (“Terms”) form a binding legal agreement between you (“you”, “user”) and Doubly Connections regarding your access to and use of the Doubly mobile application, website, and related services (“App” or “Service”). 

              By creating an account, accessing, or using the App, you agree to be bound by these Terms, together with our Community Guidelines and Privacy Policy (collectively, the “Agreement”). If you do not agree, do not use the App. 

              We may update these Terms from time to time. When we make material changes, we will notify you (for example, through an in-app notice or email). Your continued use of the App after changes take effect constitutes your acceptance of the updated Terms. 

              

              2. Eligibility and Account Creation 

              Age and University Status 

              You must be at least 18 years old (or the age of majority in your jurisdiction, if higher) and legally allowed to use online dating services. 

              Doubly is primarily intended for university and college students and young adults. By registering, you represent that you meet these eligibility requirements. 

              We do not knowingly permit minors. If we believe or learn that you are under 18, your account may be suspended or removed. 

              Account Registration 
              To use the App, you must create an account and provide certain information, including: 

              A valid email address or other login method 

              A username 

              A secure password 

              Basic profile details (such as age, gender, university) 

              You agree to: 

              Provide accurate, current, and complete information 

              Maintain and promptly update your information 

              Keep your password confidential 

              Be responsible for all activities that occur under your account 

              You may not: 

              Create more than one account 

              Create an account on behalf of someone else 

              Use another person’s account or share your account with others 

              Impersonate any person or entity 

              If you use a third-party login (for example, sign-in with a social account), you authorize us to access limited information from that service as permitted by your settings and our Privacy Policy. 

              

              3. User Responsibilities and Acceptable Use 

              By using Doubly, you agree to: 

              Follow our Community Guidelines and act respectfully towards others 

              Comply with all applicable laws and regulations 

              Use the App only for personal, non-commercial purposes 

              Refrain from any conduct that could harm the safety, rights, or experience of other users or Doubly 

              You agree that you will not: 

              Misrepresent your identity, age, or intentions 

              Use the App for commercial, advertising, or research purposes without our written consent 

              Collect or harvest information about other users for any reason outside the App 

              Use the App in a way that could interfere with, disrupt, or negatively affect the Service or other users’ enjoyment of it 

              You are responsible for your interactions with other users, both online and offline. Use caution and common sense, especially when deciding to meet in person. 

              

              4. App Features and Usage 

              Double-Date Matching 
              Doubly’s primary feature allows you to: 

              Pair with a friend to form a “double date” team 

              Match with another pair of users 

              Chat in a group (typically four people) and optionally transition to one-on-one chats if everyone is comfortable 

              All parties involved in a match must comply with these Terms and our Community Guidelines. Misconduct by you or your friend may affect both accounts. 

              Feature Changes 
              We continually develop and improve the Service, which means: 

              Certain features may be added, modified, or removed at any time 

              Some features may be experimental or offered only to certain user groups or regions 
              We are not obligated to maintain any particular feature. 

              Advertisements and Third-Party Content 
              The App may display advertisements, offers, or other content from third parties. You understand that: 

              Advertisements are provided for your information; we do not endorse or guarantee any third-party products or services 

              Your dealings with third parties (including any transactions) are solely between you and the third party 

              We are not responsible for any loss or damage arising from such dealings 

              

              5. Premium Subscriptions and Purchases 

              Premium Services 
              Doubly may offer optional paid features or subscription plans (“Premium Services”), such as: 

              Advanced filters 

              Visibility boosts 

              Additional likes or other enhancements 

              Before you purchase, we will display the applicable price and any key terms. 

              Billing and Auto-Renewal 

              Subscriptions are typically auto-renewing for the same term (e.g., monthly), unless you cancel before the renewal date. 

              By purchasing, you authorize us or our payment processor/app store to charge your selected payment method for recurring subscription fees and any applicable taxes. 

              If prices change, we will inform you in advance or as required by the platform; you may cancel prior to the price change taking effect. 

              Cancellation 

              If you subscribed through an app store (such as the Apple App Store or Google Play), you must cancel via that store’s account settings. 

              If you subscribed directly through our systems, you may cancel in-app or by contacting support. 

              Cancellation takes effect at the end of the current billing period; you retain access to premium features until then. 

              Deleting your account or uninstalling the App does not automatically cancel your subscription. 

              Refunds 

              All fees and purchases are non-refundable, except where required by law or expressly stated otherwise. 

              You are not entitled to a refund or credit for partial subscription periods, unused features, or if your account is suspended or terminated due to violation of these Terms. 

              Payment Processing 

              Payments are processed by third-party payment processors or app stores. 

              We generally do not store full credit card numbers; those are handled by the processor. 

              You are responsible for ensuring your payment method is valid and up to date. 

              

              6. Prohibited Conduct 

              To maintain a safe and respectful community, you must not: 

              Engage in illegal activities 

              Use the App to plan or commit crimes, including but not limited to fraud, trafficking, or distribution of illegal substances. 

              Harass or abuse others 

              Harassment, bullying, stalking, threats, doxxing, or targeted abuse are strictly prohibited. 

              Hate speech or any attack on people based on race, ethnicity, nationality, religion, gender, sexual orientation, disability, or any protected characteristic is not allowed. 

              Share explicit or violent content 

              No nudity or sexually explicit content in public profiles or photos. 

              No depictions of graphic violence, gore, or content that glorifies or incites self-harm or violence. 

              Exploit or endanger minors 

              No accounts or content involving anyone under 18. 

              Any sexual or suggestive content involving minors, or attempts to contact minors, will result in immediate ban and may be reported to authorities. 

              Impersonate others or misrepresent yourself 

              Do not pretend to be someone you are not, use another person’s photos, or misrepresent your status (e.g., relationship, age). 

              Spam or solicit 

              No unsolicited advertisements, promotions, pyramid schemes, “sugar” arrangements, or mass-messaging for commercial or political purposes. 

              Misuse personal data 

              Do not collect, store, or share personal information about other users outside the App without their consent. 

              Do not share other users’ private messages, photos, or data with third parties without permission. 

              Introduce malware or attempt hacking 

              No viruses, malware, unauthorized scraping, bots, or attempts to gain unauthorized access to our systems. 

              Do not reverse engineer, decompile, or otherwise attempt to obtain the App’s source code. 

              Circumvent enforcement 

              Do not create new accounts to evade bans, blocks, or other enforcement actions. 

              Do not encourage others to violate our Terms or Guidelines. 

              Any behavior that we determine, in our sole discretion, to be abusive, harmful, deceptive, or contrary to the spirit of Doubly may result in enforcement action. 

              

              7. Account Suspension and Termination 

              By You 
              You may delete your account at any time via the App’s settings. Deleting your account will remove your profile from public view and begin our data removal or anonymization process as described in the Privacy Policy. 

              By Us 
              We may suspend or terminate your account, limit your access, or remove your content at any time, with or without notice, if: 

              You violate these Terms, the Community Guidelines, or the Privacy Policy 

              We suspect fraudulent or illegal activity 

              We receive credible complaints about your conduct on or off the App involving users you met through Doubly 

              Doing so is necessary to protect our community or comply with law 

              Consequences may include: 

              Removal of specific content 

              Warnings or temporary restrictions 

              Temporary suspension 

              Permanent ban from Doubly (and potentially any affiliated services) 

              If your account is terminated for violating our policies, you are not entitled to any refund of fees already paid. 

              Certain provisions of these Terms (including disclaimers, limitations of liability, and dispute provisions) will survive termination. 

              

              8. Disclaimers of Warranties 

              You understand and agree that: 

              The App and Services are provided on an “AS IS” and “AS AVAILABLE” basis. 

              We make no guarantees that the App will be error-free, uninterrupted, secure, or that any defects will be corrected. 

              We do not guarantee that you will find matches, friendships, relationships, or any particular outcome from using Doubly. 

              We do not routinely verify the identity, background, or statements of users and cannot guarantee that profile information is accurate. 

              You are solely responsible for your interactions with other users both online and offline. 

              To the fullest extent permitted by law, we disclaim all warranties, whether express, implied, or statutory, including any implied warranties of merchantability, fitness for a particular purpose, and non-infringement. 

              Some jurisdictions do not allow the exclusion of certain warranties, so some of the above may not apply to you. 

              

              9. Limitation of Liability 

              To the maximum extent permitted by law: 

              Doubly Connections, its affiliates, officers, directors, employees, agents, and licensors will not be liable for any indirect, incidental, consequential, special, or punitive damages, or any loss of profits, data, use, goodwill, or other intangible losses, arising out of or related to your use of (or inability to use) the App. 

              Without limiting the foregoing, we are not liable for: 

              The conduct, acts, or omissions of other users on or off the App 

              Any personal or property damage resulting from meetings or interactions with users you met through Doubly 

              Unauthorized access to or alteration of your content or data 

              Any issues arising from third-party services or products you use in connection with the App 

              In no event shall our total liability to you for all claims exceed the greater of: 

              The amount you have paid to Doubly in subscription or other fees in the 12 months preceding the claim; or 

              $100 USD (or equivalent in your local currency). 

              Some jurisdictions do not allow the limitation or exclusion of liability for incidental or consequential damages, so the above limitation may not apply to you. 

              

              10. Indemnification 

              You agree to indemnify, defend, and hold harmless Doubly Connections, its affiliates, and their respective officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, and expenses (including reasonable attorneys’ fees) arising out of or in any way related to: 

              Your use or misuse of the App 

              Your violation of these Terms, the Community Guidelines, or applicable law 

              Your content and communications, including any allegation that they infringe or violate third-party rights 

              Your interactions with other users, online or offline 

              We reserve the right to assume exclusive defense and control of any matter otherwise subject to indemnification by you, in which case you agree to cooperate with us. 

              

              11. Governing Law and Dispute Resolution 

              Unless otherwise required by the laws of your country of residence, these Terms and any dispute arising from or relating to them or the App shall be governed by the laws of the jurisdiction where Doubly is incorporated, without regard to conflict-of-laws principles. 

              Subject to any mandatory local consumer protections: 

              Any disputes not subject to arbitration (if applicable) must be brought in the courts located in that jurisdiction. 

              You consent to the personal jurisdiction and venue of such courts. 

              We may include an arbitration clause or additional dispute-resolution terms specific to your region in a separate notice. Where applicable and permitted by law, disputes may be resolved through binding individual arbitration rather than in court, and class actions or class procedures may be waived. 

              Small-claims actions and requests for injunctive or equitable relief may still be brought in a court of competent jurisdiction. 

              

              12. Miscellaneous 

              Entire Agreement: These Terms, the Community Guidelines, and the Privacy Policy constitute the entire agreement between you and Doubly regarding your use of the App. 

              Severability: If any provision is held invalid, the remaining provisions shall remain in full force and effect. 

              No Waiver: Our failure to enforce any provision does not waive our right to enforce it later. 

              Assignment: You may not transfer or assign your rights or obligations under these Terms without our prior written consent. We may assign or transfer our rights and obligations in connection with a merger, acquisition, sale of assets, or by operation of law. 

              No Third-Party Beneficiaries: These Terms do not create any third-party beneficiary rights. 

              Contact: For questions about these Terms, you may contact us at: 
              Email: support@doublyconnections.com 

              Doubly Connections – Privacy Policy 

              Last Updated: December 1, 2025 

              This Privacy Policy explains how Doubly Connections (“Doubly”, “we”, “us”, “our”) collects, uses, shares, and protects your information when you use our mobile application, website, and services (“Service” or “App”). 

              By creating an account or using Doubly, you agree to the practices described in this Policy. 

              

              1. Information We Collect 

              We collect the following categories of information: 

              1.1 Account Registration Data 

              Email address or other login method 

              Username 

              Password (stored in hashed form) 

              Basic profile details such as age, gender, and university/school 

              Optional phone number for verification or account recovery 

              1.2 Profile Information 

              Photos you upload 

              Bio, interests, hobbies, prompts, and preferences (e.g., who you want to meet) 

              Information about your friend pairing for double dates (e.g., which friend is paired with you) 
              Everything you choose to add to your profile is visible to other users unless otherwise indicated. 

              1.3 Location Data 

              With your permission, we collect location information in order to show nearby matches and relevant features. This may include: 

              Precise GPS location when you use the app 

              Approximate location derived from IP address or device settings 
              You can control location access in your device settings, though certain features may not work without it. 

              1.4 User Content and Communications 

              We collect: 

              Messages you send and receive (including group and one-on-one chats) 

              Photos or other media shared in messages 

              Any content you create, upload, or share in the App (profile content, feedback, support requests) 

              Messages are stored on our servers for delivery, safety, and backup. We do not routinely monitor all message content but may review it in limited situations described in Section 2. 

              1.5 Usage and Device Information 

              We automatically collect information about how you interact with the App, such as: 

              Dates and times of log-ins and usage 

              Features you use and content you view 

              Match and message activity 

              App version, device type, operating system, device IDs, language, and IP address 

              Crash logs and performance data 

              1.6 Cookies and Similar Technologies 

              If we provide a web interface or use web-like technologies, we may use cookies, local storage, or similar technologies to: 

              Keep you logged in 

              Remember preferences 

              Perform analytics and measure app performance 

              You can usually control cookie usage in your browser or device settings. 

              1.7 Support and Contact Data 

              When you contact our support team, we collect: 

              Your contact details (email, username, etc.) 

              The content of your message and any attachments (like screenshots) 
              We keep these communications to assist you and improve our service. 

              1.8 Sensitive Personal Data 

              We do not require sensitive categories of personal data (such as health, political opinions, or religious beliefs). If you choose to share such information in your profile or messages, you do so voluntarily, and it will be processed as part of your content. 

              

              2. How We Use Your Information 

              We use your information for the following purposes: 

              2.1 To Provide and Operate the Service 

              Create and manage your account 

              Display your profile and photos to other users and show other users’ profiles to you 

              Facilitate matches, double-date pairings, and group or direct chat 

              Provide basic App functionality such as search, filters, and notifications 

              2.2 Communication 

              Send account-related communications (verification emails, security notices, updates) 

              Send notifications about matches, messages, and activity on your account 

              Send marketing messages or newsletters if you opt-in (you may unsubscribe at any time) 

              2.3 Personalization and Matching 

              Suggest compatible individual users or pairs based on your profile, preferences, location, and in-app behavior 

              Customize the content and order of profiles shown to you 

              Recommend features or promotions that may be relevant 

              2.4 Safety, Security, and Enforcement 

              We use your data to: 

              Detect and prevent spam, scams, and other abuse 

              Enforce our Terms of Service and Community Guidelines 

              Investigate and respond to reports and complaints 

              Protect our users, the public, and Doubly from harm 

              This may involve: 

              Automated tools to detect suspicious activity or policy violations (e.g., spam patterns, certain keywords) 

              Human moderators reviewing reported content or accounts, including reading relevant portions of messages or viewing flagged photos 

              Maintaining records of banned accounts or device identifiers to prevent misuse 

              We may also use information to respond to emergencies, such as threats of self-harm or violence, including contacting appropriate authorities if necessary. 

              2.5 Service Improvement and Analytics 

              We analyze how users use the App to: 

              Fix bugs and improve reliability 

              Develop new features and functionalities 

              Optimize design and user experience 

              Conduct analytics and statistical reporting (typically in aggregate form) 

              This includes using aggregated or de-identified data for research and business analysis. 

              2.6 Advertising and Marketing 

              We may use your information to: 

              Show in-app ads (if we implement advertising) 

              Measure the effectiveness of our own campaigns (for example, knowing which ad led to a new installation) 

              Target or exclude users in marketing campaigns (for instance, not showing install ads to current users) 

              We may share limited, non-identifying data with marketing partners (such as hashed identifiers or general demographic/interest categories) solely to support these functions. We do not sell your personal information. 

              2.7 Legal Compliance 

              We process and retain information as necessary to: 

              Comply with legal obligations 

              Respond to lawful requests by public authorities 

              Establish, exercise, or defend legal claims 

              Prevent fraud and maintain the security of our systems 

              

              3. How We Share Your Information 

              We do not sell your personal data. We share information only in the ways described below. 

              3.1 With Other Users 

              By using Doubly, certain information is visible to other users: 

              Your profile (photos, first name/display name, age, university, bio, interests, etc.) 

              Match and chat activity (e.g., if you like or match with another user, or participate in a group chat) 

              Any information you voluntarily share in messages or group chats 

              We do not automatically share your email, phone number, or other contact details unless you choose to share them in your content. 

              3.2 Service Providers 

              We use trusted third-party companies to help us operate and improve the App. These providers may process your information on our behalf for: 

              Cloud hosting and data storage 

              App analytics and performance monitoring 

              Payment processing and subscription management 

              Email or SMS delivery 

              Customer support systems 

              Safety and content moderation tools 

              These service providers are contractually obligated to: 

              Use data only to perform services for us 

              Keep data confidential and secure 

              3.3 Affiliates and Corporate Transactions 

              If Doubly is part of a group of related companies, we may share information within that group for safety, analytics, and internal operations, consistent with this Policy. 

              If we engage in a merger, acquisition, reorganization, sale of assets, or similar transaction, your information may be transferred as part of that transaction. The receiving entity will continue to protect your data as described in this Policy or in a policy with similar protections. 

              3.4 Legal and Safety Reasons 

              We may disclose information if we reasonably believe it is necessary to: 

              Comply with any applicable law, regulation, legal process, or governmental request 

              Enforce our Terms, Community Guidelines, or other agreements 

              Respond to claims that content violates the rights of third parties 

              Detect, prevent, or address fraud, security, or technical issues 

              Protect the rights, property, or safety of users, the public, or Doubly 

              This could include sharing information with law enforcement, courts, or other authorities when required. 

              3.5 Aggregated and De-Identified Information 

              We may share aggregated or de-identified information that cannot reasonably be used to identify you. For example, we may share statistics about usage patterns or double-date trends with partners or the public. 

              

              4. Data Storage, Retention, and Security 

              4.1 Storage and International Transfers 

              Your information may be stored and processed on servers located in various countries, which may have different data-protection laws than your home country. We take steps to ensure that any international transfers comply with applicable laws and that your data receives appropriate protection. 

              4.2 Retention 

              We retain personal data: 

              For as long as your account remains active 

              As long as necessary to provide the Service and fulfill the purposes described in this Policy 

              As required by law (for example, to maintain certain transaction records) 

              As necessary to resolve disputes or enforce our agreements 

              When you delete your account: 

              Your profile is removed from public view. 

              We will delete or anonymize your personal data within a reasonable time, except where retention is required for legitimate business or legal purposes (such as safety records of banned accounts). 

              Backups may store data for an additional limited period before they are overwritten. 

              4.3 Security 

              We use appropriate technical and organizational measures to protect your data, including: 

              Encryption of data in transit (HTTPS) and, where appropriate, at rest 

              Storage of passwords in hashed form 

              Access controls and authentication for internal systems 

              Regular security updates, monitoring, and testing 

              Despite these measures, no system is perfectly secure. We cannot guarantee absolute security of your data, but we strive to protect it to the best of our abilities. 

              You can help by: 

              Using a strong, unique password 

              Keeping your login details confidential 

              Logging out or securing your device when not in use 

              If we become aware of a data breach that affects your personal information, we will notify you and any relevant authorities as required by law. 

              

              5. Your Rights and Choices 

              Depending on your location, you may have certain rights regarding your personal data. Subject to local law, these may include: 

              Access: You can request a copy of the personal data we hold about you. 

              Correction: You can ask us to correct inaccurate or incomplete information. 

              Deletion: You can request that we delete your personal data, subject to legal and safety constraints. 

              Restriction: You may request limited processing of your data in certain circumstances. 

              Portability: You may request a copy of your data in a structured, machine-readable format where technically feasible. 

              Objection: You may object to certain processing, such as direct marketing. 

              Consent Withdrawal: Where processing is based on your consent (e.g., location services or marketing emails), you can withdraw consent at any time. 

              Many of these rights can be exercised directly in the App (for example, editing your profile or deleting your account). For other requests, contact us using the details in Section 7. 

              We may need to verify your identity before responding to rights requests. We will respond within a reasonable period and in accordance with applicable law. 

              You also have the right to lodge a complaint with your local data-protection authority if you believe your rights have been infringed. We encourage you to contact us first so we can try to resolve your concerns. 

              

              6. Third-Party Services 

              The App may contain links to, or integrations with, third-party services (for example, social media logins, external websites, or payment processors). If you access these services: 

              Their own privacy policies and terms apply to any data they collect from you. 

              We are not responsible for their practices or content. 

              We recommend that you review the privacy policies of any third-party services you use in connection with Doubly. 

              

              7. Children’s Privacy 

              Doubly is intended only for users aged 18 and older. We do not knowingly collect personal information from anyone under 18. 

              If we learn that someone under 18 has an account or has provided personal data, we will take steps to remove that account and delete the information. 

              If you are a parent or guardian and believe your child has used Doubly, please contact us so we can take appropriate action. 

              

              8. Changes to This Privacy Policy 

              We may update this Privacy Policy periodically. When we do, we will revise the “Last Updated” date at the top and may provide additional notice (such as an in-app notification or email) for material changes. 

              Your continued use of the App after an updated Policy is posted means you accept the changes. If you do not agree, you should stop using Doubly and may delete your account. 

              

              9. Contact Us 

              If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, you can contact us at: 

              Email: privacy@doublyconnections.com 

              Doubly Connections – Community Guidelines 

              Our goal: Doubly is a place for university students and young adults to go on fun, safe double dates and make connections. These Community Guidelines are here to set expectations for behavior on the App and during interactions that stem from it. By using Doubly, you agree to follow these rules. 

              1. Be Kind and Respectful 

              Treat every user with courtesy and empathy. 

              Avoid insults, name-calling, humiliation, or attempts to belittle others. 

              If a conversation isn’t going well, it’s okay to disengage or politely end it—do not escalate or retaliate. 

              2. Respect Boundaries and Consent 

              Consent is essential in all interactions—online and offline. 

              Do not pressure anyone into sharing personal details, photos, or engaging in sexual conversation. 

              If anyone says “no” or seems uncomfortable, stop and change the topic or step back. 

              When meeting in person, ask before initiating physical contact (even something like a hug). 

              Always respect your friend’s boundaries too—check with them before sharing any of their personal information or stories. 

              3. No Harassment or Hate 

              Prohibited behaviors include: 

              Harassment, bullying, stalking, and repeated unwanted contact 

              Threats or intimidation 

              Hate speech or discriminatory remarks based on race, ethnicity, nationality, religion, gender, sexual orientation, disability, or other protected traits 

              Telling others to harm themselves or encouraging self-harm 

              If you encounter harassment or hate, report it and consider unmatching or blocking instead of engaging. 

              4. Double-Date Etiquette 

              Because Doubly is about pairs, good etiquette means: 

              Include everyone in the conversation, both in chat and in person. Don’t leave one person out or make them feel like a “third wheel.” 

              Coordinate with your own friend before sharing any personal details about them. 

              If you’re more interested in one member of the other pair, be considerate—do not embarrass their friend or make them feel unwelcome. 

              If plans change (e.g., one person drops out, or you want to move to one-on-one hangouts), communicate clearly and make sure everyone is comfortable. 

              5. Authenticity – Be Yourself 

              Use real photos of yourself (and your friend, with their permission). 

              Do not use heavily edited or misleading photos. 

              No fake identities, catfishing, or pretending to be someone else. 

              Each person must have their own account; no joint accounts. 

              Do not lie about your age, intentions, relationship status, or university affiliation. 

              6. No Explicit or Inappropriate Content 

              No nudity or pornographic content in profile photos or bios. 

              No sexually explicit or extremely graphic language in public profile fields. 

              Do not send unsolicited sexual images or explicit content (“cyber-flashing”). 

              Avoid violent or gory content—this is a dating app, not a shock site. 

              7. No Violence, Threats, or Self-Harm Advocacy 

              Do not threaten violence or encourage others to commit violence. 

              Do not glorify or celebrate violence or abuse. 

              Do not encourage self-harm or suicide. If someone is in distress, encourage them to seek professional help or contact emergency services; you may also report it to us so we can provide resources. 

              8. No Scams, Fraud, or Financial Exploitation 

              Do not ask other users for money, gifts, loans, or financial help. 

              Do not attempt to run scams (ticket scams, fake emergencies, investment schemes, etc.). 

              Never share your banking info, passwords, or codes with other users. 

              If anyone asks you for money or personal financial information, assume it is a scam and report it. 

              9. No Promotion or Solicitation 

              Doubly is not for selling products, promoting content, or recruiting customers. 

              Do not use your profile primarily to advertise your business, social media, or other services. 

              Political campaigning, fundraising, or mass solicitation is not allowed. 

              Occasional personal references (e.g., “I’m in a band”) are okay as long as the focus remains on dating/social connection. 

              10. Protect Personal Information 

              Avoid posting sensitive details like full name, home address, phone number, or personal email in your profile. 

              Be cautious about when and with whom you share your contact info. 

              Never share someone else’s personal info or private messages without their consent. 

              Do not “doxx” anyone (revealing their address, workplace, etc.) under any circumstances. 

              11. One Person per Account; Adults Only 

              Every account must represent one real person who is at least 18 years old. 

              No minors, no accounts created on behalf of minors, and no photos featuring unaccompanied minors. 

              If we suspect an account belongs to someone under 18, we may request verification or remove the account. 

              12. Zero-Tolerance for Child Sexual Exploitation 

              Any content or behavior involving sexualization of minors, child sexual abuse material, or attempts to contact minors will result in immediate and permanent ban and may be reported to law enforcement. 

              If you ever encounter such content, report it immediately. Do not share or forward it. 

              13. No Illegal Behavior 

              If it is illegal in the real world, it is not allowed on Doubly. 

              Do not use the app to buy or sell illegal drugs, weapons, or any illegal goods or services. 

              Do not promote or organize criminal activities. 

              14. Stay Active and Courteous 

              Try to respond to messages in a timely and respectful manner. 

              Ghosting is not against the rules, but a brief polite message is appreciated if you are no longer interested. 

              If you are done with Doubly, consider deleting or pausing your account instead of leaving a stale profile. 

              

              Reporting Violations 

              If you see something that violates these Guidelines or makes you feel unsafe: 

              Use the in-app report feature on the user, message, or content. 

              Provide as much detail as you can so our team can review. 

              Reports are confidential; we do not tell users who reported them. 

              Do not misuse the reporting system. Submitting false or malicious reports can result in action against your account. 

              

              Enforcement and Consequences 

              Depending on the severity and frequency of the violation, we may: 

              Remove or edit content 

              Issue a warning 

              Temporarily restrict certain features 

              Temporarily suspend your account 

              Permanently ban your account (and potentially related accounts/devices) 

              Escalate to law enforcement or other authorities in serious cases 

              We may also take action for harmful behavior that occurs offline if it involves people you met through Doubly (for example, harassment or assault on a date). 

              If your account is actioned and you believe it is a mistake, you may contact support to request a review. We will examine appeals but are under no obligation to reinstate accounts where we determine our original decision was appropriate. 

              By using Doubly, you are helping build a community built on kindness, consent, and safety. Thank you for doing your part. 

 
            </Text>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onDecline}
              style={[styles.button, { borderColor: theme.colors.primary }]}
            >
              Decline
            </Button>
            <Button
              mode="contained"
              onPress={onAccept}
              disabled={!scrolledToEnd}
              style={styles.button}
            >
              Accept
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: Dimensions.get("window").width * 0.9,
    maxHeight: Dimensions.get("window").height * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  tosContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default TOSPopup;