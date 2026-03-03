import { Helmet } from "react-helmet";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const FAQ = () => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const faqItems = [
    { question: t('faq.questions.q1'), answer: t('faq.questions.a1') },
    { question: t('faq.questions.q2'), answer: t('faq.questions.a2') },
    { question: t('faq.questions.q3'), answer: t('faq.questions.a3') },
    { question: t('faq.questions.q4'), answer: t('faq.questions.a4') },
    { question: t('faq.questions.q5'), answer: t('faq.questions.a5') },
    { question: t('faq.questions.q6'), answer: t('faq.questions.a6') },
    { question: t('faq.questions.q7'), answer: t('faq.questions.a7') },
    { question: t('faq.questions.q8'), answer: t('faq.questions.a8') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: t('faq.messageSent'),
      description: t('faq.messageSentDesc')
    });
    setName("");
    setEmail("");
    setMessage("");
    setIsSubmitting(false);
  };

  return (
    <>
      <Helmet>
        <title>{t('faq.title')} | Cook</title>
        <meta name="description" content={t('faq.subtitle')} />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <div className="hidden md:block"><Header /></div>

        <main className="flex-1 container mx-auto px-4 py-4 pt-4 md:py-12 md:pt-28 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-3 md:space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-2 md:mb-4">
                <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold">{t('faq.title')}</h1>
              <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
                {t('faq.subtitle')}
              </p>
            </div>

            {/* FAQ Accordion */}
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Contact Section */}
            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    {t('faq.contact')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Input placeholder={t('faq.yourName')} value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                      <Input type="email" placeholder={t('faq.yourEmail')} value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <Textarea placeholder={t('faq.yourMessage')} value={message} onChange={e => setMessage(e.target.value)} rows={4} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? t('faq.sending') : t('faq.sendMessage')}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    {t('faq.otherChannels')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">{t('faq.supportEmail')}</h4>
                    <a
                      href="mailto:evolinkbr@gmail.com"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      evolinkbr@gmail.com
                    </a>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Instagram</h4>
                    <a
                      href="https://www.instagram.com/cookai.oficial/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      @cookai.oficial
                    </a>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{t('faq.businessHours')}</h4>
                    <p className="text-muted-foreground">{t('faq.businessHoursValue')}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{t('faq.responseTime')}</h4>
                    <p className="text-muted-foreground">{t('faq.responseTimeValue')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <div className="hidden md:block"><Footer /></div>
        <MobileBottomNav />
      </div>
    </>
  );
};

export default FAQ;
