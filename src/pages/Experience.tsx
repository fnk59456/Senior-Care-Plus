import { Button } from "@/components/ui/button";
import { FolderOpen, Briefcase, BookOpen, Medal, ArrowUpRight } from "lucide-react";

export default function Experience() {
  return (
    <div className="space-y-16">
      {/* Experience Header */}
      <section className="space-y-4">
        <h1 className="gradient-text">My Experience</h1>
        <p className="text-muted-foreground max-w-2xl">
          Professional experience, internships, and academic achievements that have shaped my career.
        </p>
      </section>

      {/* Timeline */}
      <div className="relative border-l-2 border-primary/30 pl-8 space-y-12 ml-4">
        {/* NTHU Research Experience */}
        <div className="relative">
          <span className="absolute w-5 h-5 bg-primary rounded-full -left-[41px] flex items-center justify-center">
            <span className="w-2 h-2 bg-background rounded-full"></span>
          </span>
          
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-primary/10 p-4 flex items-center gap-3">
              <BookOpen className="text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Research Assistant</h2>
                  <span className="px-2 py-0.5 bg-accent/30 text-accent-foreground rounded-full text-xs">2021/9 - 2023/8</span>
                </div>
                <p className="text-muted-foreground">National Tsing Hua University - Micro System Laboratory</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Medal className="h-4 w-4 text-primary" />
                  Key Achievements
                </h3>
                <ul className="space-y-2 pl-5 list-disc marker:text-primary">
                  <li>Successfully developed and optimized a MEMS-based pressure sensor using advanced fabrication techniques</li>
                  <li>Conducted comprehensive simulation analyses using COMSOL to optimize sensor performance</li>
                  <li>Presented research findings at the 16th IEEE-NEMS international conference</li>
                  <li>Authored a detailed master's thesis on MEMS pressure sensor design and fabrication</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Responsibilities</h3>
                <ul className="space-y-2 pl-5 list-disc marker:text-primary/70">
                  <li>Designed and fabricated MEMS devices using cleanroom processes</li>
                  <li>Conducted simulation and testing of various sensor prototypes</li>
                  <li>Collaborated with other researchers on interdisciplinary projects</li>
                  <li>Documented research findings and prepared academic presentations</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Skills Applied</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">MEMS Fabrication</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">COMSOL Simulation</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Photolithography</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Data Analysis</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Technical Writing</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Research & Development</span>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" asChild>
                <a 
                  href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload5.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  View Master's Thesis
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
        
        {/* TSMC Internship */}
        <div className="relative">
          <span className="absolute w-5 h-5 bg-primary rounded-full -left-[41px] flex items-center justify-center">
            <span className="w-2 h-2 bg-background rounded-full"></span>
          </span>
          
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-primary/10 p-4 flex items-center gap-3">
              <Briefcase className="text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Engineering Intern</h2>
                  <span className="px-2 py-0.5 bg-accent/30 text-accent-foreground rounded-full text-xs">2020/7 - 2020/8</span>
                </div>
                <p className="text-muted-foreground">TSMC - Module Integration & Manufacturing Engineering</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Medal className="h-4 w-4 text-primary" />
                  Key Achievements
                </h3>
                <ul className="space-y-2 pl-5 list-disc marker:text-primary">
                  <li>Successfully analyzed production data to identify process improvement opportunities</li>
                  <li>Participated in cross-functional team meetings to discuss quality control measures</li>
                  <li>Gained hands-on experience in semiconductor manufacturing processes</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Responsibilities</h3>
                <ul className="space-y-2 pl-5 list-disc marker:text-primary/70">
                  <li>Assisted in monitoring and analyzing production data</li>
                  <li>Participated in quality control assessments</li>
                  <li>Supported engineers in process improvement activities</li>
                  <li>Learned about advanced semiconductor manufacturing techniques</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Skills Applied</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Data Analysis</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Quality Control</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Process Engineering</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Team Collaboration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* NCTU University Project */}
        <div className="relative">
          <span className="absolute w-5 h-5 bg-primary rounded-full -left-[41px] flex items-center justify-center">
            <span className="w-2 h-2 bg-background rounded-full"></span>
          </span>
          
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-primary/10 p-4 flex items-center gap-3">
              <FolderOpen className="text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Academic Project</h2>
                  <span className="px-2 py-0.5 bg-accent/30 text-accent-foreground rounded-full text-xs">2021/2 - 2021/6</span>
                </div>
                <p className="text-muted-foreground">National Central University - Automated Optical Inspection System</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Medal className="h-4 w-4 text-primary" />
                  Project Highlights
                </h3>
                <ul className="space-y-2 pl-5 list-disc marker:text-primary">
                  <li>Developed an automated optical inspection system for detecting defects in manufactured parts</li>
                  <li>Implemented computer vision algorithms to identify and classify various types of defects</li>
                  <li>Created a user-friendly interface for operating the inspection system</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Technologies Used</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Python</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">OpenCV</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Machine Learning</span>
                  <span className="px-3 py-1 bg-secondary/60 rounded-full text-sm">Image Processing</span>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" asChild>
                <a 
                  href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload1.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  View Project Documentation
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
        
        {/* End mark */}
        <div className="absolute w-3 h-3 bg-primary/30 rounded-full -left-[30px] -bottom-2"></div>
      </div>
      
      {/* CTA Section */}
      <section className="bg-primary/5 rounded-2xl p-8 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Looking for my technical skills?</h2>
          <p className="text-muted-foreground">
            Check out my detailed skills page for a comprehensive overview of my technical capabilities.
          </p>
        </div>
        <Button asChild>
          <a href="/skills">View My Skills</a>
        </Button>
      </section>
    </div>
  );
} 