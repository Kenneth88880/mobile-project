import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Linking,
} from "react-native";
import { Button, useTheme } from "react-native-paper";

const TOSPopup = ({ visible, onAccept, onDecline }) => {
  const theme = useTheme();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  // Reset scroll state every time modal opens so users must re-read
  useEffect(() => {
    if (visible) {
      setScrolledToEnd(false);
    }
  }, [visible]);

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }) => {
    const paddingToBottom = 50;
    return (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    );
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:contact@doubly.ca");
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
          style={[styles.modalView, { backgroundColor: theme.colors.surface }]}
        >
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
            onContentSizeChange={(contentWidth, contentHeight) => {
              // If content fits without scrolling, auto-enable accept
              // (unlikely for your TOS, but a safety net)
            }}
            onLayout={(event) => {
              // Store layout height for content-fits check if ever needed
            }}
            scrollEventThrottle={16}
          >
            <Text style={{ color: theme.colors.onSurface }}>
              Doubly Connections – Terms of Service{"\n\n"}
              1. Acceptance of Terms{"\n\n"}
              Welcome to Doubly Connections ("Doubly", "we", "us", "our"), a
              double-dating application for university students.{"\n\n"}
              These Terms of Service ("Terms") form a binding legal agreement
              between you ("you", "user") and Doubly Connections regarding your
              access to and use of the Doubly mobile application, website, and
              related services ("App" or "Service").{"\n\n"}
              By creating an account, accessing, or using the App, you agree to
              be bound by these Terms, together with our Community Guidelines
              and Privacy Policy (collectively, the "Agreement"). If you do not
              agree, do not use the App.{"\n\n"}
              We may update these Terms from time to time. When we make material
              changes, we will notify you (for example, through an in-app notice
              or email). Your continued use of the App after changes take effect
              constitutes your acceptance of the updated Terms.{"\n\n"}
              2. Eligibility and Account Creation{"\n\n"}
              Age and University Status{"\n"}• You must be at least 18 years old
              (or the age of majority in your jurisdiction, if higher) and
              legally allowed to use online dating services.{"\n"}• Doubly is
              primarily intended for university and college students and young
              adults. By registering, you represent that you meet these
              eligibility requirements.{"\n"}• We do not knowingly permit
              minors. If we believe or learn that you are under 18, your account
              may be suspended or removed.{"\n\n"}
              Account Registration{"\n"}
              To use the App, you must create an account and provide certain
              information, including:{"\n"}• A valid email address or other
              login method{"\n"}• A username{"\n"}• A secure password{"\n"}•
              Basic profile details (such as age, gender, university){"\n\n"}
              You agree to:{"\n"}• Provide accurate, current, and complete
              information{"\n"}• Maintain and promptly update your information
              {"\n"}• Keep your password confidential{"\n"}• Be responsible for
              all activities that occur under your account{"\n\n"}
              You may not:{"\n"}• Create more than one account{"\n"}• Create an
              account on behalf of someone else{"\n"}• Use another person's
              account or share your account with others{"\n"}• Impersonate any
              person or entity{"\n\n"}
              If you use a third-party login (for example, sign-in with a social
              account), you authorize us to access limited information from that
              service as permitted by your settings and our Privacy Policy.
              {"\n\n"}
              3. User Responsibilities and Acceptable Use{"\n\n"}
              By using Doubly, you agree to:{"\n"}• Follow our Community
              Guidelines and act respectfully towards others{"\n"}• Comply with
              all applicable laws and regulations{"\n"}• Use the App only for
              personal, non-commercial purposes{"\n"}• Refrain from any conduct
              that could harm the safety, rights, or experience of other users
              or Doubly{"\n\n"}
              You agree that you will not:{"\n"}• Misrepresent your identity,
              age, or intentions{"\n"}• Use the App for commercial, advertising,
              or research purposes without our written consent{"\n"}• Collect or
              harvest information about other users for any reason outside the
              App{"\n"}• Use the App in a way that could interfere with,
              disrupt, or negatively affect the Service or other users'
              enjoyment of it{"\n\n"}
              You are responsible for your interactions with other users, both
              online and offline. Use caution and common sense, especially when
              deciding to meet in person.{"\n\n"}
              4. App Features and Usage{"\n\n"}
              Double-Date Matching{"\n"}
              Doubly's primary feature allows you to:{"\n"}• Pair with a friend
              to form a "double date" team{"\n"}• Match with another pair of
              users{"\n"}• Chat in a group (typically four people) and
              optionally transition to one-on-one chats if everyone is
              comfortable{"\n\n"}
              All parties involved in a match must comply with these Terms and
              our Community Guidelines. Misconduct by you or your friend may
              affect both accounts.{"\n\n"}
              Feature Changes{"\n"}
              We continually develop and improve the Service, which means:{"\n"}
              • Certain features may be added, modified, or removed at any time
              {"\n"}• Some features may be experimental or offered only to
              certain user groups or regions{"\n"}• We are not obligated to
              maintain any particular feature.{"\n\n"}
              Advertisements and Third-Party Content{"\n"}
              The App may display advertisements, offers, or other content from
              third parties. You understand that:{"\n"}• Advertisements are
              provided for your information; we do not endorse or guarantee any
              third-party products or services{"\n"}• Your dealings with third
              parties (including any transactions) are solely between you and
              the third party{"\n"}• We are not responsible for any loss or
              damage arising from such dealings{"\n\n"}
              5. Premium Subscriptions and Purchases{"\n\n"}
              Premium Services{"\n"}
              Doubly may offer optional paid features or subscription plans
              ("Premium Services"), such as:{"\n"}• Advanced filters{"\n"}•
              Visibility boosts{"\n"}• Additional likes or other enhancements
              {"\n\n"}
              Before you purchase, we will display the applicable price and any
              key terms.{"\n\n"}
              Billing and Auto-Renewal{"\n"}• Subscriptions are typically
              auto-renewing for the same term (e.g., monthly), unless you cancel
              before the renewal date.{"\n"}• By purchasing, you authorize us or
              our payment processor/app store to charge your selected payment
              method for recurring subscription fees and any applicable taxes.
              {"\n"}• If prices change, we will inform you in advance or as
              required by the platform; you may cancel prior to the price change
              taking effect.{"\n\n"}
              Cancellation{"\n"}• If you subscribed through an app store (such
              as the Apple App Store or Google Play), you must cancel via that
              store's account settings.{"\n"}• If you subscribed directly
              through our systems, you may cancel in-app or by contacting
              support.{"\n"}• Cancellation takes effect at the end of the
              current billing period; you retain access to premium features
              until then.{"\n"}• Deleting your account or uninstalling the App
              does not automatically cancel your subscription.{"\n\n"}
              Refunds{"\n"}• All fees and purchases are non-refundable, except
              where required by law or expressly stated otherwise.{"\n"}• You
              are not entitled to a refund or credit for partial subscription
              periods, unused features, or if your account is suspended or
              terminated due to violation of these Terms.{"\n\n"}
              Payment Processing{"\n"}• Payments are processed by third-party
              payment processors or app stores.{"\n"}• We generally do not store
              full credit card numbers; those are handled by the processor.
              {"\n"}• You are responsible for ensuring your payment method is
              valid and up to date.{"\n\n"}
              6. Prohibited Conduct{"\n\n"}
              To maintain a safe and respectful community, you must not:{"\n\n"}
              1. Engage in illegal activities{"\n"}• Use the App to plan or
              commit crimes, including but not limited to fraud, trafficking, or
              distribution of illegal substances.{"\n\n"}
              2. Harass or abuse others{"\n"}• Harassment, bullying, stalking,
              threats, doxxing, or targeted abuse are strictly prohibited.{"\n"}
              • Hate speech or any attack on people based on race, ethnicity,
              nationality, religion, gender, sexual orientation, disability, or
              any protected characteristic is not allowed.{"\n\n"}
              3. Share explicit or violent content{"\n"}• No nudity or sexually
              explicit content in public profiles or photos.{"\n"}• No
              depictions of graphic violence, gore, or content that glorifies or
              incites self-harm or violence.{"\n\n"}
              4. Exploit or endanger minors{"\n"}• No accounts or content
              involving anyone under 18.{"\n"}• Any sexual or suggestive content
              involving minors, or attempts to contact minors, will result in
              immediate ban and may be reported to authorities.{"\n\n"}
              5. Impersonate others or misrepresent yourself{"\n"}• Do not
              pretend to be someone you are not, use another person's photos, or
              misrepresent your status (e.g., relationship, age).{"\n\n"}
              6. Spam or solicit{"\n"}• No unsolicited advertisements,
              promotions, pyramid schemes, "sugar" arrangements, or
              mass-messaging for commercial or political purposes.{"\n\n"}
              7. Misuse personal data{"\n"}• Do not collect, store, or share
              personal information about other users outside the App without
              their consent.{"\n"}• Do not share other users' private messages,
              photos, or data with third parties without permission.{"\n\n"}
              8. Introduce malware or attempt hacking{"\n"}• No viruses,
              malware, unauthorized scraping, bots, or attempts to gain
              unauthorized access to our systems.{"\n"}• Do not reverse
              engineer, decompile, or otherwise attempt to obtain the App's
              source code.{"\n\n"}
              9. Circumvent enforcement{"\n"}• Do not create new accounts to
              evade bans, blocks, or other enforcement actions.{"\n"}• Do not
              encourage others to violate our Terms or Guidelines.{"\n\n"}
              Any behavior that we determine, in our sole discretion, to be
              abusive, harmful, deceptive, or contrary to the spirit of Doubly
              may result in enforcement action.{"\n\n"}
              7. Account Suspension and Termination{"\n\n"}
              By You{"\n"}
              You may delete your account at any time via the App's settings.
              Deleting your account will remove your profile from public view
              and begin our data removal or anonymization process as described
              in the Privacy Policy.{"\n\n"}
              By Us{"\n"}
              We may suspend or terminate your account, limit your access, or
              remove your content at any time, with or without notice, if:{"\n"}
              • You violate these Terms, the Community Guidelines, or the
              Privacy Policy{"\n"}• We suspect fraudulent or illegal activity
              {"\n"}• We receive credible complaints about your conduct on or
              off the App involving users you met through Doubly{"\n"}• Doing so
              is necessary to protect our community or comply with law{"\n\n"}
              Consequences may include:{"\n"}• Removal of specific content{"\n"}
              • Warnings or temporary restrictions{"\n"}• Temporary suspension
              {"\n"}• Permanent ban from Doubly (and potentially any affiliated
              services){"\n\n"}
              If your account is terminated for violating our policies, you are
              not entitled to any refund of fees already paid.{"\n\n"}
              Certain provisions of these Terms (including disclaimers,
              limitations of liability, and dispute provisions) will survive
              termination.{"\n\n"}
              8. Disclaimers of Warranties{"\n\n"}
              You understand and agree that:{"\n"}• The App and Services are
              provided on an "AS IS" and "AS AVAILABLE" basis.{"\n"}• We make no
              guarantees that the App will be error-free, uninterrupted, secure,
              or that any defects will be corrected.{"\n"}• We do not guarantee
              that you will find matches, friendships, relationships, or any
              particular outcome from using Doubly.{"\n"}• We do not routinely
              verify the identity, background, or statements of users and cannot
              guarantee that profile information is accurate.{"\n"}• You are
              solely responsible for your interactions with other users both
              online and offline.{"\n\n"}
              To the fullest extent permitted by law, we disclaim all
              warranties, whether express, implied, or statutory, including any
              implied warranties of merchantability, fitness for a particular
              purpose, and non-infringement.{"\n\n"}
              Some jurisdictions do not allow the exclusion of certain
              warranties, so some of the above may not apply to you.{"\n\n"}
              9. Limitation of Liability{"\n\n"}
              To the maximum extent permitted by law:{"\n"}• Doubly Connections,
              its affiliates, officers, directors, employees, agents, and
              licensors will not be liable for any indirect, incidental,
              consequential, special, or punitive damages, or any loss of
              profits, data, use, goodwill, or other intangible losses, arising
              out of or related to your use of (or inability to use) the App.
              {"\n\n"}
              Without limiting the foregoing, we are not liable for:{"\n"}• The
              conduct, acts, or omissions of other users on or off the App{"\n"}
              • Any personal or property damage resulting from meetings or
              interactions with users you met through Doubly{"\n"}• Unauthorized
              access to or alteration of your content or data{"\n"}• Any issues
              arising from third-party services or products you use in
              connection with the App{"\n\n"}
              In no event shall our total liability to you for all claims exceed
              the greater of:{"\n"}• The amount you have paid to Doubly in
              subscription or other fees in the 12 months preceding the claim;
              or{"\n"}• $100 USD (or equivalent in your local currency).{"\n\n"}
              Some jurisdictions do not allow the limitation or exclusion of
              liability for incidental or consequential damages, so the above
              limitation may not apply to you.{"\n\n"}
              10. Indemnification{"\n\n"}
              You agree to indemnify, defend, and hold harmless Doubly
              Connections, its affiliates, and their respective officers,
              directors, employees, and agents from and against any and all
              claims, liabilities, damages, losses, and expenses (including
              reasonable attorneys' fees) arising out of or in any way related
              to:{"\n"}• Your use or misuse of the App{"\n"}• Your violation of
              these Terms, the Community Guidelines, or applicable law{"\n"}•
              Your content and communications, including any allegation that
              they infringe or violate third-party rights{"\n"}• Your
              interactions with other users, online or offline{"\n\n"}
              We reserve the right to assume exclusive defense and control of
              any matter otherwise subject to indemnification by you, in which
              case you agree to cooperate with us.{"\n\n"}
              11. Governing Law and Dispute Resolution{"\n\n"}
              Unless otherwise required by the laws of your country of
              residence, these Terms and any dispute arising from or relating to
              them or the App shall be governed by the laws of the jurisdiction
              where Doubly is incorporated, without regard to conflict-of-laws
              principles.{"\n\n"}
              Subject to any mandatory local consumer protections:{"\n"}• Any
              disputes not subject to arbitration (if applicable) must be
              brought in the courts located in that jurisdiction.{"\n"}• You
              consent to the personal jurisdiction and venue of such courts.
              {"\n\n"}
              We may include an arbitration clause or additional
              dispute-resolution terms specific to your region in a separate
              notice. Where applicable and permitted by law, disputes may be
              resolved through binding individual arbitration rather than in
              court, and class actions or class procedures may be waived.
              {"\n\n"}
              Small-claims actions and requests for injunctive or equitable
              relief may still be brought in a court of competent jurisdiction.
              {"\n\n"}
              12. Miscellaneous{"\n\n"}• Entire Agreement: These Terms, the
              Community Guidelines, and the Privacy Policy constitute the entire
              agreement between you and Doubly regarding your use of the App.
              {"\n"}• Severability: If any provision is held invalid, the
              remaining provisions shall remain in full force and effect.{"\n"}•
              No Waiver: Our failure to enforce any provision does not waive our
              right to enforce it later.{"\n"}• Assignment: You may not transfer
              or assign your rights or obligations under these Terms without our
              prior written consent. We may assign or transfer our rights and
              obligations in connection with a merger, acquisition, sale of
              assets, or by operation of law.{"\n"}• No Third-Party
              Beneficiaries: These Terms do not create any third-party
              beneficiary rights.{"\n\n"}
              Contact: For questions about these Terms, you may contact us at:
              {"\n"}
              Email:
            </Text>
            <Text
              style={{
                color: theme.colors.primary,
                textDecorationLine: "underline",
              }}
              onPress={handleEmailPress}
            >
              contact@doubly.ca
            </Text>

            <Text
              style={[styles.sectionDivider, { color: theme.colors.onSurface }]}
            >
              {"\n"}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{"\n\n"}
            </Text>

            <Text
              style={[styles.sectionTitle, { color: theme.colors.primary }]}
            >
              Privacy Policy{"\n"}
            </Text>

            <Text style={{ color: theme.colors.onSurface }}>
              Last Updated: December 1, 2025{"\n\n"}
              This Privacy Policy explains how Doubly Connections ("Doubly",
              "we", "us", "our") collects, uses, shares, and protects your
              information when you use our mobile application, website, and
              services ("Service" or "App").{"\n\n"}
              By creating an account or using Doubly, you agree to the practices
              described in this Policy.{"\n\n"}
              1. Information We Collect{"\n\n"}
              We collect the following categories of information:{"\n\n"}
              1.1 Account Registration Data{"\n"}• Email address or other login
              method{"\n"}• Username{"\n"}• Password (stored in hashed form)
              {"\n"}• Basic profile details such as age, gender, and
              university/school{"\n"}• Optional phone number for verification or
              account recovery{"\n\n"}
              1.2 Profile Information{"\n"}• Photos you upload{"\n"}• Bio,
              interests, hobbies, prompts, and preferences (e.g., who you want
              to meet){"\n"}• Information about your friend pairing for double
              dates (e.g., which friend is paired with you){"\n\n"}
              Everything you choose to add to your profile is visible to other
              users unless otherwise indicated.{"\n\n"}
              1.3 Location Data{"\n"}
              With your permission, we collect location information in order to
              show nearby matches and relevant features. This may include:{"\n"}
              • Precise GPS location when you use the app{"\n"}• Approximate
              location derived from IP address or device settings{"\n\n"}
              You can control location access in your device settings, though
              certain features may not work without it.{"\n\n"}
              1.4 User Content and Communications{"\n"}
              We collect:{"\n"}• Messages you send and receive (including group
              and one-on-one chats){"\n"}• Photos or other media shared in
              messages{"\n"}• Any content you create, upload, or share in the
              App (profile content, feedback, support requests){"\n\n"}
              Messages are stored on our servers for delivery, safety, and
              backup. We do not routinely monitor all message content but may
              review it in limited situations described in Section 2.{"\n\n"}
              1.5 Usage and Device Information{"\n"}
              We automatically collect information about how you interact with
              the App, such as:{"\n"}• Dates and times of log-ins and usage
              {"\n"}• Features you use and content you view{"\n"}• Match and
              message activity{"\n"}• App version, device type, operating
              system, device IDs, language, and IP address{"\n"}• Crash logs and
              performance data{"\n\n"}
              1.6 Cookies and Similar Technologies{"\n"}
              If we provide a web interface or use web-like technologies, we may
              use cookies, local storage, or similar technologies to:{"\n"}•
              Keep you logged in{"\n"}• Remember preferences{"\n"}• Perform
              analytics and measure app performance{"\n\n"}
              You can usually control cookie usage in your browser or device
              settings.{"\n\n"}
              1.7 Support and Contact Data{"\n"}
              When you contact our support team, we collect:{"\n"}• Your contact
              details (email, username, etc.){"\n"}• The content of your message
              and any attachments (like screenshots){"\n\n"}
              We keep these communications to assist you and improve our
              service.{"\n\n"}
              1.8 Sensitive Personal Data{"\n"}
              We do not require sensitive categories of personal data (such as
              health, political opinions, or religious beliefs). If you choose
              to share such information in your profile or messages, you do so
              voluntarily, and it will be processed as part of your content.
              {"\n\n"}
              2. How We Use Your Information{"\n\n"}
              We use your information for the following purposes:{"\n\n"}
              2.1 To Provide and Operate the Service{"\n"}• Create and manage
              your account{"\n"}• Display your profile and photos to other users
              and show other users' profiles to you{"\n"}• Facilitate matches,
              double-date pairings, and group or direct chat{"\n"}• Provide
              basic App functionality such as search, filters, and notifications
              {"\n\n"}
              2.2 Communication{"\n"}• Send account-related communications
              (verification emails, security notices, updates){"\n"}• Send
              notifications about matches, messages, and activity on your
              account{"\n"}• Send marketing messages or newsletters if you
              opt-in (you may unsubscribe at any time){"\n\n"}
              2.3 Personalization and Matching{"\n"}• Suggest compatible
              individual users or pairs based on your profile, preferences,
              location, and in-app behavior{"\n"}• Customize the content and
              order of profiles shown to you{"\n"}• Recommend features or
              promotions that may be relevant{"\n\n"}
              2.4 Safety, Security, and Enforcement{"\n"}
              We use your data to:{"\n"}• Detect and prevent spam, scams, and
              other abuse{"\n"}• Enforce our Terms of Service and Community
              Guidelines{"\n"}• Investigate and respond to reports and
              complaints{"\n"}• Protect our users, the public, and Doubly from
              harm{"\n\n"}
              This may involve:{"\n"}• Automated tools to detect suspicious
              activity or policy violations (e.g., spam patterns, certain
              keywords){"\n"}• Human moderators reviewing reported content or
              accounts, including reading relevant portions of messages or
              viewing flagged photos{"\n"}• Maintaining records of banned
              accounts or device identifiers to prevent misuse{"\n\n"}
              We may also use information to respond to emergencies, such as
              threats of self-harm or violence, including contacting appropriate
              authorities if necessary.{"\n\n"}
              2.5 Service Improvement and Analytics{"\n"}
              We analyze how users use the App to:{"\n"}• Fix bugs and improve
              reliability{"\n"}• Develop new features and functionalities{"\n"}•
              Optimize design and user experience{"\n"}• Conduct analytics and
              statistical reporting (typically in aggregate form){"\n\n"}
              This includes using aggregated or de-identified data for research
              and business analysis.{"\n\n"}
              2.6 Advertising and Marketing{"\n"}
              We may use your information to:{"\n"}• Show in-app ads (if we
              implement advertising){"\n"}• Measure the effectiveness of our own
              campaigns{"\n"}• Target or exclude users in marketing campaigns
              {"\n\n"}
              We may share limited, non-identifying data with marketing
              partners. We do not sell your personal information.{"\n\n"}
              2.7 Legal Compliance{"\n"}
              We process and retain information as necessary to:{"\n"}• Comply
              with legal obligations{"\n"}• Respond to lawful requests by public
              authorities{"\n"}• Establish, exercise, or defend legal claims
              {"\n"}• Prevent fraud and maintain the security of our systems
              {"\n\n"}
              3. How We Share Your Information{"\n\n"}
              We do not sell your personal data. We share information only in
              the ways described below.{"\n\n"}
              3.1 With Other Users{"\n"}
              By using Doubly, certain information is visible to other users:
              {"\n"}• Your profile (photos, first name/display name, age,
              university, bio, interests, etc.){"\n"}• Match and chat activity
              {"\n"}• Any information you voluntarily share in messages or group
              chats{"\n\n"}
              We do not automatically share your email, phone number, or other
              contact details unless you choose to share them in your content.
              {"\n\n"}
              3.2 Service Providers{"\n"}
              We use trusted third-party companies to help us operate and
              improve the App. These providers may process your information on
              our behalf for:{"\n"}• Cloud hosting and data storage{"\n"}• App
              analytics and performance monitoring{"\n"}• Payment processing and
              subscription management{"\n"}• Email or SMS delivery{"\n"}•
              Customer support systems{"\n"}• Safety and content moderation
              tools{"\n\n"}
              These service providers are contractually obligated to:{"\n"}• Use
              data only to perform services for us{"\n"}• Keep data confidential
              and secure{"\n\n"}
              3.3 Affiliates and Corporate Transactions{"\n"}
              If Doubly is part of a group of related companies, we may share
              information within that group for safety, analytics, and internal
              operations, consistent with this Policy.{"\n\n"}
              If we engage in a merger, acquisition, reorganization, sale of
              assets, or similar transaction, your information may be
              transferred as part of that transaction.{"\n\n"}
              3.4 Legal and Safety Reasons{"\n"}
              We may disclose information if we reasonably believe it is
              necessary to:{"\n"}• Comply with any applicable law, regulation,
              legal process, or governmental request{"\n"}• Enforce our Terms,
              Community Guidelines, or other agreements{"\n"}• Respond to claims
              that content violates the rights of third parties{"\n"}• Detect,
              prevent, or address fraud, security, or technical issues{"\n"}•
              Protect the rights, property, or safety of users, the public, or
              Doubly{"\n\n"}
              This could include sharing information with law enforcement,
              courts, or other authorities when required.{"\n\n"}
              3.5 Aggregated and De-Identified Information{"\n"}
              We may share aggregated or de-identified information that cannot
              reasonably be used to identify you.{"\n\n"}
              4. Data Storage, Retention, and Security{"\n\n"}
              4.1 Storage and International Transfers{"\n"}
              Your information may be stored and processed on servers located in
              various countries, which may have different data-protection laws
              than your home country.{"\n\n"}
              4.2 Retention{"\n"}
              We retain personal data:{"\n"}• For as long as your account
              remains active{"\n"}• As long as necessary to provide the Service
              and fulfill the purposes described in this Policy{"\n"}• As
              required by law{"\n"}• As necessary to resolve disputes or enforce
              our agreements{"\n\n"}
              When you delete your account:{"\n"}• Your profile is removed from
              public view{"\n"}• We will delete or anonymize your personal data
              within a reasonable time, except where retention is required for
              legitimate business or legal purposes{"\n\n"}
              4.3 Security{"\n"}
              We use appropriate technical and organizational measures to
              protect your data, including:{"\n"}• Encryption of data in transit
              (HTTPS) and, where appropriate, at rest{"\n"}• Storage of
              passwords in hashed form{"\n"}• Access controls and authentication
              for internal systems{"\n"}• Regular security updates, monitoring,
              and testing{"\n\n"}
              Despite these measures, no system is perfectly secure. We cannot
              guarantee absolute security of your data, but we strive to protect
              it to the best of our abilities.{"\n\n"}
              You can help by:{"\n"}• Using a strong, unique password{"\n"}•
              Keeping your login details confidential{"\n"}• Logging out or
              securing your device when not in use{"\n\n"}
              If we become aware of a data breach that affects your personal
              information, we will notify you and any relevant authorities as
              required by law.{"\n\n"}
              5. Your Rights and Choices{"\n\n"}
              Depending on your location, you may have certain rights regarding
              your personal data. Subject to local law, these may include:{"\n"}
              • Access: You can request a copy of the personal data we hold
              about you{"\n"}• Correction: You can ask us to correct inaccurate
              or incomplete information{"\n"}• Deletion: You can request that we
              delete your personal data, subject to legal and safety constraints
              {"\n"}• Restriction: You may request limited processing of your
              data in certain circumstances{"\n"}• Portability: You may request
              a copy of your data in a structured, machine-readable format{"\n"}
              • Objection: You may object to certain processing, such as direct
              marketing{"\n"}• Consent Withdrawal: Where processing is based on
              your consent, you can withdraw consent at any time{"\n\n"}
              Many of these rights can be exercised directly in the App. For
              other requests, contact us using the details in Section 9.{"\n\n"}
              6. Third-Party Services{"\n\n"}
              The App may contain links to, or integrations with, third-party
              services. If you access these services:{"\n"}• Their own privacy
              policies and terms apply to any data they collect from you{"\n"}•
              We are not responsible for their practices or content{"\n\n"}
              7. Children's Privacy{"\n\n"}
              Doubly is intended only for users aged 18 and older. We do not
              knowingly collect personal information from anyone under 18.
              {"\n\n"}
              If we learn that someone under 18 has an account or has provided
              personal data, we will take steps to remove that account and
              delete the information.{"\n\n"}
              8. Changes to This Privacy Policy{"\n\n"}
              We may update this Privacy Policy periodically. When we do, we
              will revise the "Last Updated" date at the top and may provide
              additional notice for material changes.{"\n\n"}
              Your continued use of the App after an updated Policy is posted
              means you accept the changes.{"\n\n"}
              9. Contact Us{"\n\n"}
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your personal information, you can contact us
              at:{"\n"}
              Email:
            </Text>
            <Text
              style={{
                color: theme.colors.primary,
                textDecorationLine: "underline",
              }}
              onPress={handleEmailPress}
            >
              contact@doubly.ca
            </Text>

            <Text
              style={[styles.sectionDivider, { color: theme.colors.onSurface }]}
            >
              {"\n"}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{"\n\n"}
            </Text>

            <Text
              style={[styles.sectionTitle, { color: theme.colors.primary }]}
            >
              Community Guidelines{"\n"}
            </Text>

            <Text style={{ color: theme.colors.onSurface }}>
              Our goal: Doubly is a place for university students and young
              adults to go on fun, safe double dates and make connections. These
              Community Guidelines are here to set expectations for behavior on
              the App and during interactions that stem from it. By using
              Doubly, you agree to follow these rules.{"\n\n"}
              1. Be Kind and Respectful{"\n"}• Treat every user with courtesy
              and empathy.{"\n"}• Avoid insults, name-calling, humiliation, or
              attempts to belittle others.{"\n"}• If a conversation isn't going
              well, it's okay to disengage or politely end it—do not escalate or
              retaliate.{"\n\n"}
              2. Respect Boundaries and Consent{"\n"}• Consent is essential in
              all interactions—online and offline.{"\n"}• Do not pressure anyone
              into sharing personal details, photos, or engaging in sexual
              conversation.{"\n"}• If anyone says "no" or seems uncomfortable,
              stop and change the topic or step back.{"\n"}• When meeting in
              person, ask before initiating physical contact (even something
              like a hug).{"\n"}• Always respect your friend's boundaries
              too—check with them before sharing any of their personal
              information or stories.{"\n\n"}
              3. No Harassment or Hate{"\n"}
              Prohibited behaviors include:{"\n"}• Harassment, bullying,
              stalking, and repeated unwanted contact{"\n"}• Threats or
              intimidation{"\n"}• Hate speech or discriminatory remarks based on
              race, ethnicity, nationality, religion, gender, sexual
              orientation, disability, or other protected traits{"\n"}• Telling
              others to harm themselves or encouraging self-harm{"\n\n"}
              If you encounter harassment or hate, report it and consider
              unmatching or blocking instead of engaging.{"\n\n"}
              4. Double-Date Etiquette{"\n"}
              Because Doubly is about pairs, good etiquette means:{"\n"}•
              Include everyone in the conversation, both in chat and in person.
              Don't leave one person out or make them feel like a "third wheel."
              {"\n"}• Coordinate with your own friend before sharing any
              personal details about them.{"\n"}• If you're more interested in
              one member of the other pair, be considerate—do not embarrass
              their friend or make them feel unwelcome.{"\n"}• If plans change
              (e.g., one person drops out, or you want to move to one-on-one
              hangouts), communicate clearly and make sure everyone is
              comfortable.{"\n\n"}
              5. Authenticity – Be Yourself{"\n"}• Use real photos of yourself
              (and your friend, with their permission).{"\n"}• Do not use
              heavily edited or misleading photos.{"\n"}• No fake identities,
              catfishing, or pretending to be someone else.{"\n"}• Each person
              must have their own account; no joint accounts.{"\n"}• Do not lie
              about your age, intentions, relationship status, or university
              affiliation.{"\n\n"}
              6. No Explicit or Inappropriate Content{"\n"}• No nudity or
              pornographic content in profile photos or bios.{"\n"}• No sexually
              explicit or extremely graphic language in public profile fields.
              {"\n"}• Do not send unsolicited sexual images or explicit content
              ("cyber-flashing").{"\n"}• Avoid violent or gory content—this is a
              dating app, not a shock site.{"\n\n"}
              7. No Violence, Threats, or Self-Harm Advocacy{"\n"}• Do not
              threaten violence or encourage others to commit violence.{"\n"}•
              Do not glorify or celebrate violence or abuse.{"\n"}• Do not
              encourage self-harm or suicide. If someone is in distress,
              encourage them to seek professional help or contact emergency
              services; you may also report it to us so we can provide
              resources.{"\n\n"}
              8. No Scams, Fraud, or Financial Exploitation{"\n"}• Do not ask
              other users for money, gifts, loans, or financial help.{"\n"}• Do
              not attempt to run scams (ticket scams, fake emergencies,
              investment schemes, etc.).{"\n"}• Never share your banking info,
              passwords, or codes with other users.{"\n"}• If anyone asks you
              for money or personal financial information, assume it is a scam
              and report it.{"\n\n"}
              9. No Promotion or Solicitation{"\n"}• Doubly is not for selling
              products, promoting content, or recruiting customers.{"\n"}• Do
              not use your profile primarily to advertise your business, social
              media, or other services.{"\n"}• Political campaigning,
              fundraising, or mass solicitation is not allowed.{"\n"}•
              Occasional personal references (e.g., "I'm in a band") are okay as
              long as the focus remains on dating/social connection.{"\n\n"}
              10. Protect Personal Information{"\n"}• Avoid posting sensitive
              details like full name, home address, phone number, or personal
              email in your profile.{"\n"}• Be cautious about when and with whom
              you share your contact info.{"\n"}• Never share someone else's
              personal info or private messages without their consent.{"\n"}• Do
              not "doxx" anyone (revealing their address, workplace, etc.) under
              any circumstances.{"\n\n"}
              11. One Person per Account; Adults Only{"\n"}• Every account must
              represent one real person who is at least 18 years old.{"\n"}• No
              minors, no accounts created on behalf of minors, and no photos
              featuring unaccompanied minors.{"\n"}• If we suspect an account
              belongs to someone under 18, we may request verification or remove
              the account.{"\n\n"}
              12. Zero-Tolerance for Child Sexual Exploitation{"\n"}• Any
              content or behavior involving sexualization of minors, child
              sexual abuse material, or attempts to contact minors will result
              in immediate and permanent ban and may be reported to law
              enforcement.{"\n"}• If you ever encounter such content, report it
              immediately. Do not share or forward it.{"\n\n"}
              13. No Illegal Behavior{"\n"}• If it is illegal in the real world,
              it is not allowed on Doubly.{"\n"}• Do not use the app to buy or
              sell illegal drugs, weapons, or any illegal goods or services.
              {"\n"}• Do not promote or organize criminal activities.{"\n\n"}
              14. Stay Active and Courteous{"\n"}• Try to respond to messages in
              a timely and respectful manner.{"\n"}• Ghosting is not against the
              rules, but a brief polite message is appreciated if you are no
              longer interested.{"\n"}• If you are done with Doubly, consider
              deleting or pausing your account instead of leaving a stale
              profile.{"\n\n"}
              Reporting Violations{"\n\n"}
              If you see something that violates these Guidelines or makes you
              feel unsafe:{"\n"}• Use the in-app report feature on the user,
              message, or content.{"\n"}• Provide as much detail as you can so
              our team can review.{"\n"}• Reports are confidential; we do not
              tell users who reported them.{"\n\n"}
              Do not misuse the reporting system. Submitting false or malicious
              reports can result in action against your account.{"\n\n"}
              Enforcement and Consequences{"\n\n"}
              Depending on the severity and frequency of the violation, we may:
              {"\n"}• Remove or edit content{"\n"}• Issue a warning{"\n"}•
              Temporarily restrict certain features{"\n"}• Temporarily suspend
              your account{"\n"}• Permanently ban your account (and potentially
              related accounts/devices){"\n"}• Escalate to law enforcement or
              other authorities in serious cases{"\n\n"}
              We may also take action for harmful behavior that occurs offline
              if it involves people you met through Doubly (for example,
              harassment or assault on a date).{"\n\n"}
              If your account is actioned and you believe it is a mistake, you
              may contact support to request a review. We will examine appeals
              but are under no obligation to reinstate accounts where we
              determine our original decision was appropriate.{"\n\n"}
              By using Doubly, you are helping build a community built on
              kindness, consent, and safety. Thank you for doing your part.
              {"\n\n"}
              Contact Us{"\n\n"}
              If you have questions, concerns, or requests you can contact us
              at:{"\n"}
              Email:
            </Text>
            <Text
              style={{
                color: theme.colors.primary,
                textDecorationLine: "underline",
                marginBottom: 20,
              }}
              onPress={handleEmailPress}
            >
              contact@doubly.ca
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
