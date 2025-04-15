import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-12 bg-gradient-to-b from-background via-background to-muted/25">
      <div className="max-w-4xl mx-auto bg-card p-8 rounded-lg shadow-md border border-border/50">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" className="p-0 hover:bg-transparent hover:text-primary">
              &larr; Back to Home
            </Button>
          </Link>
          
          <span className="text-sm text-muted-foreground">Recuvia</span>
        </div>
        
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-lost to-found">Privacy Policy</h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-8">
          <p className="text-lg font-medium border-l-4 border-lost pl-4 py-2 bg-lost/5">
            Last Updated: 3/21/2025
          </p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-lost border-b pb-2">Introduction</h2>
            <p className="text-base leading-relaxed">
              At Recuvia, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-lost border-b pb-2">Information We Collect</h2>
            <p className="text-base leading-relaxed">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-lost mr-2">•</span>
                <span>Personal information such as your name and email address</span>
              </li>
              <li className="flex items-start">
                <span className="text-lost mr-2">•</span>
                <span>Images and descriptions of lost or found items</span>
              </li>
              <li className="flex items-start">
                <span className="text-lost mr-2">•</span>
                <span>Location information related to lost or found items</span>
              </li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-lost border-b pb-2">How We Use Your Information</h2>
            <p className="text-base leading-relaxed">
              We use the information we collect for various purposes, including:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-lost mr-2">•</span>
                <span>To provide and maintain our service</span>
              </li>
              <li className="flex items-start">
                <span className="text-lost mr-2">•</span>
                <span>To match lost items with found items</span>
              </li>
              <li className="flex items-start">
                <span className="text-lost mr-2">•</span>
                <span>To facilitate communication between users</span>
              </li>
              <li className="flex items-start">
                <span className="text-lost mr-2">•</span>
                <span>To improve our service and develop new features</span>
              </li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-lost border-b pb-2">Data Security</h2>
            <p className="text-base leading-relaxed">
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-lost border-b pb-2">Third-Party Services</h2>
            <p className="text-base leading-relaxed">
              We may use third-party services to help us operate our service. These services may have access to your information solely to perform tasks on our behalf.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-lost border-b pb-2">Changes to This Privacy Policy</h2>
            <p className="text-base leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-lost border-b pb-2">Contact Us</h2>
            <p className="text-base leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:riddhimaan22@gmail.com" className="text-lost font-medium hover:underline">riddhimaan22@gmail.com</a>.
            </p>
          </section>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-12 pt-6 border-t">
          <p>Built with ❤️ by Riddhimaan Senapati</p>
        </div>
      </div>
    </main>
  );
} 