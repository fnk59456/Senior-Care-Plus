import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Download, Mail, Phone, GraduationCap, User, Briefcase, FileCode } from "lucide-react";

export default function About() {
  return (
    <div className="space-y-16">
      {/* About Me Header */}
      <section className="space-y-4">
        <h1 className="gradient-text">About Me</h1>
        <p className="text-muted-foreground max-w-2xl">
          Get to know my background, education, and career objectives.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Personal Introduction */}
        <section className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="text-primary" />
              <h2 className="text-2xl font-semibold">Personal Profile</h2>
            </div>
            <div className="pl-7 space-y-4">
              <p className="text-muted-foreground">
                I am a reliable, collaborative professional with excellent communication skills and extensive expertise in MEMS and optical device development.
              </p>
              <p className="text-muted-foreground">
                During my university and graduate studies, I focused on optical and MEMS device development, becoming proficient in PDMS microfluidic structure bonding, COMSOL simulations, photolithography, etching, and related fabrication techniques.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="text-primary" />
              <h2 className="text-2xl font-semibold">Career Objectives</h2>
            </div>
            <div className="pl-7 bg-accent/10 rounded-lg p-4 border border-accent/20">
              <p className="font-medium">
                Seeking positions in: <span className="text-primary">R&D Engineer / Process Engineer / Quality Engineer</span>
              </p>
              <p className="text-muted-foreground mt-2">
                Focus areas: <span className="font-medium">Semiconductor Devices, Optical Components, MEMS Design</span>
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-primary" />
              <h2 className="text-2xl font-semibold">Education</h2>
            </div>
            <div className="pl-7 space-y-6">
              <div className="rounded-lg border bg-card shadow-sm p-5">
                <h3 className="font-semibold text-lg">M.S., Power Mechanical Engineering</h3>
                <p className="text-sm text-muted-foreground mt-1">National Tsing Hua University | 2021/9 - 2023/8</p>
                <p className="mt-3">Focused on MEMS and optical device research</p>
              </div>
              
              <div className="rounded-lg border bg-card shadow-sm p-5">
                <h3 className="font-semibold text-lg">B.S., Mechanical Engineering</h3>
                <p className="text-sm text-muted-foreground mt-1">National Central University | 2017/9 - 2021/6</p>
                <p className="mt-3">Specialized in mechanical engineering and design</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Photo and Basic Info */}
        <section className="space-y-8">
          <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
            <div className="aspect-square w-full rounded-lg overflow-hidden mb-6">
              <img src="/image/Headshot.jpg" 
                  alt="Tzu-Yi Hsu" 
                  className="w-full h-full object-cover" />
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Basic Information</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-muted-foreground min-w-24">Gender:</span>
                    <span>Male</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-muted-foreground min-w-24">Age:</span>
                    <span>26 (as of 2025/6)</span>
                  </li>
                  <li className="flex items-start">
                    <Phone className="h-4 w-4 text-primary mr-2 mt-1" />
                    <a href="tel:0905368541" className="hover:text-primary transition-colors">
                      0905-368-541
                    </a>
                  </li>
                  <li className="flex items-start">
                    <Mail className="h-4 w-4 text-primary mr-2 mt-1" />
                    <a href="mailto:fnk59456@gmail.com" className="hover:text-primary transition-colors">
                      fnk59456@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Language Proficiency</h3>
                <div className="flex items-center gap-2 bg-secondary/50 rounded-md p-2">
                  <span className="text-sm font-medium">TOEIC:</span>
                  <span className="text-sm">620</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Button className="w-full" asChild>
                <a href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload2.pdf" target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Download Complete Resume
                </a>
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileCode className="text-primary" />
              <h3 className="font-semibold text-lg">Research Documents</h3>
            </div>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload5.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Master's Thesis
                </a>
              </li>
              <li>
                <a 
                  href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload1.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Research Project: Laser Annealing on Glass
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
      
      {/* CTA Section */}
      <section className="bg-primary/5 rounded-2xl p-8 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Interested in my expertise?</h2>
          <p className="text-muted-foreground">
            Feel free to reach out to discuss potential collaborations or opportunities.
          </p>
        </div>
        <Button asChild>
          <Link to="/contact">Contact Me</Link>
        </Button>
      </section>
    </div>
  );
} 