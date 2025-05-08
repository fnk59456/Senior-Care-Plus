import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Github, Linkedin, FileText } from "lucide-react";
import { FormEvent, useState } from "react";

export default function Contact() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 模擬表單提交
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormState({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Contact</h1>
        <p className="text-muted-foreground max-w-2xl">
          If you have any questions, research collaborations, or job opportunities, please contact me at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Contact Information</h2>
            <p className="text-muted-foreground">You can contact me directly through the following methods, or fill out the form on the right.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium">Email</h3>
                <a href="mailto:fnk59456@gmail.com" className="text-muted-foreground hover:text-primary">
                  fnk59456@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium">Phone</h3>
                <a href="tel:0905368541" className="text-muted-foreground hover:text-primary">
                  0905-368-541
                </a>
              </div>
            </div>
          </div>

          <div className="p-5 border rounded-lg bg-muted/20 mt-4">
            <h3 className="font-medium text-lg mb-3">Professional Background</h3>
            <p className="text-muted-foreground mb-4">
              I hold a master's degree in mechanical engineering from Tsinghua University, specializing in semiconductor processes, MEMS design, and optical component development. Currently, I am an R&D engineer at Lextar Electronics Corp., engaged in the development of AOI systems and advanced packaging research.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" size="sm" asChild>
                <a href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload2.pdf" 
                   target="_blank" rel="noopener noreferrer" 
                   className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" /> Download Full Resume
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 shadow-sm bg-card">
          <h2 className="text-xl font-semibold mb-4">Send Message</h2>
          
          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-primary/10 p-3 text-primary mb-4">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium mb-2">Message Sent!</h3>
              <p className="text-muted-foreground mb-4">
                Thank you for your message, I will reply to you as soon as possible.
              </p>
              <Button onClick={() => setIsSubmitted(false)}>Send New Message</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formState.name}
                  onChange={handleChange}
                  placeholder="Please enter your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleChange}
                  placeholder="Please enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </label>
                <Input
                  id="subject"
                  name="subject"
                  value={formState.subject}
                  onChange={handleChange}
                  placeholder="Message Subject"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formState.message}
                  onChange={handleChange}
                  placeholder="Please enter your message"
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 