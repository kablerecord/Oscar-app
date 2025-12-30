import { Hero } from '@/components/sections/Hero'
import { VideoPlaceholder } from '@/components/sections/VideoPlaceholder'
import { Features } from '@/components/sections/Features'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { CTA } from '@/components/sections/CTA'

export default function Home() {
  return (
    <>
      <Hero />
      <VideoPlaceholder />
      <Features />
      <HowItWorks />
      <CTA />
    </>
  )
}
