import { Deposit } from "@/components/landing/deposit";
import { DoubleBooking } from "@/components/landing/double-booking";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { ForOwners } from "@/components/landing/for-owners";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Reminders } from "@/components/landing/reminders";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 overflow-x-clip">
        <Hero />
        <HowItWorks />
        <DoubleBooking />
        <Deposit />
        <Reminders />
        <ForOwners />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
