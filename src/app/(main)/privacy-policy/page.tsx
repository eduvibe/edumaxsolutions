import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice | EduMax Solutions",
  description: "How EduMax Solutions handles information used by Bravo CBT and its connected website services.",
  alternates: {
    canonical: "https://www.edumaxsolutions.com.ng/privacy-policy",
  },
};

const sections = [
  { id: "overview", number: "01", title: "Overview" },
  { id: "app-users", number: "02", title: "Privacy for app and product users" },
  { id: "reports", number: "03", title: "Mock results, feedback, and reports" },
  { id: "online-services", number: "04", title: "Information from online services" },
  { id: "use-retention", number: "05", title: "How we use and retain information" },
  { id: "sharing-security", number: "06", title: "Sharing and security" },
  { id: "rights", number: "07", title: "Your choices and rights" },
  { id: "disclaimer", number: "08", title: "Product and content disclaimer" },
  { id: "minors", number: "09", title: "Students and minors" },
  { id: "contact", number: "10", title: "Contact us" },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
      <header className="mb-12 border-b border-border pb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">EduMax Solutions</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">Privacy Notice</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: November 2, 2026</p>
        <p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">
          This notice covers Bravo CBT and the connected website features described below, including online activation,
          Central Mock score submissions, and issue reports. It is published by EduMax Solutions. It does not make claims
          about separate school or learning services that are outside these Bravo features.
        </p>
      </header>

      <nav aria-label="Privacy notice contents" className="mb-14 rounded-2xl border border-border bg-muted/20 p-5 md:p-7">
        <h2 className="mb-4 text-sm font-bold">Contents</h2>
        <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                <span className="mr-2 font-semibold tabular-nums">{section.number}</span>{section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12 text-[0.98rem] leading-7 text-foreground/80">
        <section id="overview" className="scroll-mt-24">
          <SectionHeading number="01" title="Overview" />
          <p>
            EduMax Solutions provides Bravo CBT as an offline exam-practice product with optional connected features. We do
            not sell personal information. The offline app does not secretly collect device activity in the background; study
            data remains on the user&apos;s device. Information is transmitted when a user deliberately activates a product,
            makes an online payment, sets up or submits a Central Mock, contacts support, sends a report, or uses another
            connected feature.
          </p>
        </section>

        <section id="app-users" className="scroll-mt-24">
          <SectionHeading number="02" title="Privacy for app and product users" />
          <h3 className="mb-2 mt-6 text-lg font-bold text-foreground">Offline use</h3>
          <p>
            Bravo CBT is designed to work offline. Study activity and other app data used only on the device remain there;
            the offline app does not send background activity or usage logs. An internet connection is used when a user
            deliberately activates a product, pays online, connects to Central Mock setup or submits a score, sends a report,
            or contacts support.
          </p>
          <h3 className="mb-2 mt-6 text-lg font-bold text-foreground">Activation and licensing</h3>
          <p>
            If a user starts an online activation order, the service processes the Bravo Product ID, selected plan, order
            reference, payment state and, when supplied, an email address. The activation key is issued after payment is
            verified. The payment provider processes payment details; EduMax receives the payment result and transaction
            reference needed to complete the order. The full payment-card details are not required by the Bravo order API.
            EduMax keeps licensing and order records in its database to validate existing licences and support renewal cases;
            these records are separate from Central Mock submissions and are not removed by the mock-data cleanup.
          </p>
        </section>

        <section id="reports" className="scroll-mt-24">
          <SectionHeading number="03" title="Mock results, feedback, and reports" />
          <h3 className="mb-2 mt-6 text-lg font-bold text-foreground">Central Mock submissions</h3>
          <p>
            When a user submits a Central Mock result, the service receives the Product ID, score, total, attempt start and
            end times, and any profile name or contact details included with the submission. The activation key is checked
            to validate the submission and is not stored with the mock result. Candidate contact details are available only
            to authorized organizers; they are not included in the public leaderboard.
          </p>
          <p className="mt-4">
            The public leaderboard can display a candidate&apos;s profile name (or a masked Product ID when no name is
            available), score, total, and submission time. It does not display phone numbers or email addresses.
          </p>
          <h3 className="mb-2 mt-6 text-lg font-bold text-foreground">Issue reports and feedback</h3>
          <p>
            A question report contains a report reference, category, app version, Product ID if available, and identifiers
            such as the exam, subject, and question. Question text, answer options, and answer keys are not accepted in
            question-report submissions. General feedback may include the message the user chooses to send; please do not
            include unnecessary sensitive information in that message.
          </p>
        </section>

        <section id="online-services" className="scroll-mt-24">
          <SectionHeading number="04" title="Information from online services" />
          <h3 className="mb-2 mt-6 text-lg font-bold text-foreground">Payments and email</h3>
          <p>
            Online payments are handled through Paystack. For payment confirmation, the Bravo service stores order and
            transaction records and may use the email address supplied for an order to send its activation key through
            Resend. Bravo order, mock, and report records are stored using Turso.
          </p>
          <h3 className="mb-2 mt-6 text-lg font-bold text-foreground">Service providers</h3>
          <p>
            Paystack handles payment processing, Resend delivers activation emails, and Turso provides the database service
            used for Bravo order, mock, and report records. Each provider handles information it receives under its own
            privacy terms and retention practices. EduMax does not set or control those providers&apos; independent retention
            periods.
          </p>
        </section>

        <section id="use-retention" className="scroll-mt-24">
          <SectionHeading number="05" title="How we use and retain information" />
          <p>Information described in this notice is used to:</p>
          <ul className="my-4 list-disc space-y-2 pl-6">
            <li>validate activation and Central Mock submissions;</li>
            <li>record scores and show public mock rankings;</li>
            <li>process and support activation orders and payments;</li>
            <li>respond to issue reports and feedback; and</li>
            <li>protect the services, investigate faults, and prevent abuse.</li>
          </ul>
          <p>
            Central Mock submission records, including the submitted score and profile/contact details, are kept for 12
            months from submission and then deleted from EduMax&apos;s active mock records. This 12-month cleanup applies to
            mock records only. Licensing and order records are kept separately to validate licences and support renewals;
            they are not removed by the mock-data cleanup. Report submissions remain available for staff review and can be
            resolved or deleted by authorized staff; they do not have a 12-month automatic deletion rule. Data stored only
            on a user&apos;s device remains there.
          </p>
        </section>

        <section id="sharing-security" className="scroll-mt-24">
          <SectionHeading number="06" title="Sharing and security" />
          <p>
            Information is shared with the service providers named above only as needed for their payment, database, or email
            functions. Authorized organizers may access submitted mock contact details to administer the mock. The public
            leaderboard receives only its displayed ranking fields, not private phone or email details.
          </p>
          <p className="mt-4">
            Staff access to organizer results is protected by authorization and permissions. We use access controls and
            other technical safeguards, but no online transmission or storage system can be guaranteed completely secure.
            Users should keep their activation and account credentials private.
          </p>
        </section>

        <section id="rights" className="scroll-mt-24">
          <SectionHeading number="07" title="Your choices and rights" />
          <p>
            You may contact us to ask about personal information associated with you or to request access, correction, or
            deletion, subject to applicable law and verification that the request relates to you. Some records may need to
            remain available for payment, licensing, security, or legal reasons. Optional connected features can be avoided;
            information necessary to validate a score or complete an online order is needed for that feature to work.
          </p>
        </section>

        <section id="disclaimer" className="scroll-mt-24">
          <SectionHeading number="08" title="Product and content disclaimer" />
          <p>
            Bravo CBT is a product of EduMax Solutions and is not endorsed by or affiliated with an examination body unless
            expressly stated. It includes examination questions made publicly available for study and original practice
            questions designed by EduMax Solutions. Examination content remains attributable to the relevant examination
            body or content provider. We do not knowingly include illegally obtained content. Original questions are
            designed to assess the same concepts, rigour, and skills covered by the publicly available syllabus, and undergo
            multiple checks for accuracy, relevance, and reliability. They are supplementary practice materials, not official
            past-paper questions, and do not replace the syllabus or official examination guidance.
          </p>
        </section>

        <section id="minors" className="scroll-mt-24">
          <SectionHeading number="09" title="Students and minors" />
          <p>
            Bravo CBT is intended for exam practice and may be used by secondary-school students, including students around
            13–14 years of age and older. A student who is a minor should provide a parent&apos;s, guardian&apos;s, or school&apos;s
            phone number or email address for connected features that request contact details, rather than the student&apos;s
            own contact details. Exam registration eligibility is determined by the relevant examination body and is separate
            from access to practice materials.
          </p>
        </section>

        <section id="contact" className="scroll-mt-24 border-t border-border pt-8">
          <SectionHeading number="10" title="Contact us" />
          <p>
            For a privacy question or a request about your information, please contact us through the{" "}
            <Link href="/contact" className="font-semibold text-foreground underline underline-offset-4">EduMax Solutions contact page</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-4 border-b border-border pb-3">
      <span className="text-sm font-bold tabular-nums text-muted-foreground">{number}</span>
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h2>
    </div>
  );
}
