import { Button } from "@/components/ui/button";
import { ArrowRight, Download, Cpu, Microscope, Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col space-y-16 py-8">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center space-y-8 py-8 md:py-16">
        <div className="space-y-4">
          <h1 className="tracking-tight">
            Hello, I'm <span className="gradient-text">Tzu-Yi Hsu</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-[800px] mx-auto">
            R&D Engineer | Semiconductor Process Expert | MEMS Designer
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Button size="lg" asChild>
            <Link to="/projects">
              View Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload2.pdf" target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" /> Download Resume
            </a>
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl">
          <div className="bg-secondary/50 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-primary mb-1">3+</div>
            <div className="text-muted-foreground">Years Experience</div>
          </div>
          <div className="bg-secondary/50 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-primary mb-1">5+</div>
            <div className="text-muted-foreground">Research Projects</div>
          </div>
          <div className="bg-secondary/50 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-primary mb-1">1</div>
            <div className="text-muted-foreground">International Conference</div>
          </div>
        </div>
      </section>
      
      {/* What I Do Section */}
      <section className="py-8">
        <div className="text-center mb-12">
          <h2 className="gradient-text mb-4">What I Do</h2>
          <p className="text-muted-foreground max-w-[600px] mx-auto">
            Specialized in semiconductor processes, optical components, and MEMS design with focus on innovation and precision
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="bg-card rounded-xl p-6 shadow-md card-hover border border-border/50">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Cpu className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Semiconductor Processes</h3>
            <p className="text-muted-foreground">
              Expert in photolithography, deposition, and etching processes for semiconductor fabrication with focus on precision manufacturing.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-6 shadow-md card-hover border border-border/50">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Microscope className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">MEMS Design</h3>
            <p className="text-muted-foreground">
              Designing and developing microelectromechanical systems with expertise in pressure sensors and microfluidic structures.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-6 shadow-md card-hover border border-border/50">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Layers className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Simulation & Modeling</h3>
            <p className="text-muted-foreground">
              Proficient with COMSOL, ANSYS, and other simulation tools for accurate modeling and analysis of complex systems.
            </p>
          </div>
        </div>
      </section>
      
      {/* Featured Research */}
      <section className="py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="gradient-text mb-2">Featured Research</h2>
            <p className="text-muted-foreground">Selected highlights from my research and professional work</p>
          </div>
          <Button variant="outline" asChild className="mt-4 md:mt-0">
            <Link to="/projects">
              View All Projects <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card rounded-xl overflow-hidden shadow-md card-hover border border-border/50">
            <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center p-6 text-white font-bold text-lg text-center">
              MEMS Pressure Sensor Research
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Transducers 2023 Conference</h3>
              <p className="text-muted-foreground mb-4">
                Presented research on MEMS-based pressure sensors at one of the largest international conferences in the field of sensors and MEMS.
              </p>
              <div className="flex justify-start">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload5.pdf" target="_blank" rel="noopener noreferrer">
                    View Master's Thesis
                  </a>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl overflow-hidden shadow-md card-hover border border-border/50">
            <div className="h-48 bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center p-6 text-white font-bold text-lg text-center">
              Automated Optical Inspection System
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">AOI Development at Lextar</h3>
              <p className="text-muted-foreground mb-4">
                Developed advanced AOI systems using deep learning models for image recognition, significantly improving defect detection efficiency.
              </p>
              <div className="flex justify-start">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/experience">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-primary/5 rounded-2xl p-8 md:p-12 border border-primary/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold">Interested in working together?</h2>
            <p className="text-muted-foreground max-w-[500px]">
              I'm always open to discussing new projects, research opportunities, or potential collaborations.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/contact">
              Get In Touch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
} 