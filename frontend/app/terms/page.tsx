import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-12 bg-gradient-to-b from-background via-background to-muted/25">
      <div className="max-w-4xl mx-auto bg-card p-8 rounded-lg shadow-md border border-border/50">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" className="p-0 hover:bg-transparent hover:text-primary">
              &larr; Back to Home
            </Button>
          </Link>
          
          <span className="text-sm text-muted-foreground">FindR</span>
        </div>
        
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-lost to-found">Terms of Service</h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-8">
          <p className="text-lg font-medium border-l-4 border-found pl-4 py-2 bg-found/5">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">Welcome to FindR</h2>
            <p className="text-base leading-relaxed">
              These Terms of Service govern your use of the FindR platform and service. By using FindR, you agree to these terms.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">Use of Service</h2>
            <p className="text-base leading-relaxed">
              FindR is a platform that helps users find lost items by matching them with items that have been found and uploaded by other users.
            </p>
            <p className="text-base leading-relaxed">
              You agree to use FindR only for lawful purposes and in accordance with these Terms.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">User Accounts</h2>
            <p className="text-base leading-relaxed">
              To use certain features of FindR, you may need to create an account. You are responsible for maintaining the confidentiality of your account information.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">User Content</h2>
            <p className="text-base leading-relaxed">
              When you upload content to FindR, including images and descriptions of items, you grant us a license to use that content in connection with the operation of our service.
            </p>
            <p className="text-base leading-relaxed">
              You represent and warrant that you own or have the necessary rights to the content you post, and that your content does not violate the rights of any third party.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">Intellectual Property</h2>
            <p className="text-base leading-relaxed">
              The FindR service and its original content, features, and functionality are owned by FindR and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">Disclaimers</h2>
            <p className="text-base leading-relaxed">
              FindR is provided "as is" and "as available" without any warranties of any kind. We do not guarantee that FindR will always be secure or error-free.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">Limitation of Liability</h2>
            <p className="text-base leading-relaxed">
              To the maximum extent permitted by law, FindR shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">Changes to Terms</h2>
            <p className="text-base leading-relaxed">
              We may modify these Terms at any time. If we make changes, we will provide notice by posting the updated Terms on this page.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-found border-b pb-2">Contact Us</h2>
            <p className="text-base leading-relaxed">
              If you have any questions about these Terms, please contact us at <a href="mailto:riddhimaan22@gmail.com" className="text-found font-medium hover:underline">riddhimaan22@gmail.com</a>.
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