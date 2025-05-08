import { Link } from "react-router-dom";
import { ExternalLink, BookOpen, FileText, Microscope } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Project {
  title: string;
  description: string;
  image: string;
  technologies: string[];
  link?: string;
  featured: boolean;
}

export default function Projects() {
  const projects: Project[] = [
    {
      title: "MEMS壓力傳感器研究",
      description: "設計和開發基於MEMS技術的微型壓力傳感器，通過優化結構設計提高靈敏度和可靠性。在Transducers 2023國際會議上發表成果，這是傳感器與MEMS領域最具影響力的學術會議之一。",
      image: "bg-gradient-to-r from-blue-500 to-indigo-600",
      technologies: ["MEMS設計", "COMSOL模擬", "微製造工藝", "傳感器校準", "數據分析"],
      link: "https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload5.pdf",
      featured: true
    },
    {
      title: "玻璃雷射退火技術研究",
      description: "研究雷射退火工藝對玻璃材料特性的影響，包括光學性能優化、內部應力分析和微結構表徵。該研究為高精度光學元件製造提供了創新解決方案。",
      image: "bg-gradient-to-r from-purple-500 to-pink-500",
      technologies: ["雷射加工", "材料科學", "光學表徵", "熱處理", "ANSYS模擬"],
      link: "https://pda.104.com.tw/profile/portfolio/attachment?vno=765o9z4wx&fileId=upload1.pdf",
      featured: true
    },
    {
      title: "自動光學檢測（AOI）系統開發",
      description: "在Lextar Electronics設計並實現自動光學檢測系統，結合深度學習算法用於產品缺陷識別和分類。大幅提高了檢測效率和準確率，減少人工檢測的工作量。",
      image: "bg-gradient-to-r from-green-500 to-teal-500",
      technologies: ["機器視覺", "深度學習", "圖像處理", "自動化控制", "Python"],
      featured: true
    },
    {
      title: "晶圓級封裝（WLP）優化",
      description: "參與晶圓級封裝技術開發，優化封裝結構設計以提高產品可靠性和性能。專注於解決熱管理、應力分佈和互連可靠性等關鍵問題。",
      image: "bg-gradient-to-r from-yellow-500 to-amber-500",
      technologies: ["微電子封裝", "熱管理", "可靠性分析", "材料選擇", "製程整合"],
      featured: false
    },
    {
      title: "微流體晶片設計",
      description: "設計用於生物醫學應用的PDMS微流體晶片，包括微通道結構優化、流體動力學模擬和製造工藝開發。成功實現了樣品分離和細胞培養功能。",
      image: "bg-gradient-to-r from-red-500 to-orange-500",
      technologies: ["微流體技術", "PDMS加工", "生物相容性", "實驗設計", "原型製作"],
      featured: false
    }
  ];

  const featuredProjects = projects.filter(project => project.featured);
  const otherProjects = projects.filter(project => !project.featured);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Projects</h1>
        <p className="text-muted-foreground max-w-2xl">
          My representative research and projects, showcasing my professional capabilities in the semiconductor, MEMS, and optical fields.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Main Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProjects.map((project, index) => (
            <div key={index} className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className={`aspect-video ${project.image} flex items-center justify-center text-white font-bold text-lg p-4 text-center`}>
                {project.title}
              </div>
              <div className="flex flex-col flex-1 p-6">
                <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 flex-1">{project.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.technologies.slice(0, 3).map((tech) => (
                    <span 
                      key={tech} 
                      className="px-2 py-1 text-xs bg-muted rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-muted rounded-full">
                      +{project.technologies.length - 3}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-auto">
                  {project.link && (
                    <Button size="sm" asChild>
                      <a href={project.link} target="_blank" rel="noreferrer" className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" /> 查看文檔
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Other Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherProjects.map((project, index) => (
            <div key={index} className="p-4 border rounded-lg bg-card shadow-sm">
              <h3 className="font-medium">{project.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {project.technologies.slice(0, 2).map((tech) => (
                  <span key={tech} className="px-2 py-0.5 text-xs bg-muted rounded-full">
                    {tech}
                  </span>
                ))}
                {project.technologies.length > 2 && (
                  <span className="px-2 py-0.5 text-xs bg-muted rounded-full">
                    +{project.technologies.length - 2}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 p-6 bg-muted/30 rounded-lg border">
        <div className="flex items-start space-x-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Microscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Professional Research Philosophy</h3>
            <p className="text-muted-foreground mb-4">
              My research focuses on the innovative development of micro-electro-mechanical systems (MEMS) and optical components, through the integration of advanced materials science, precision manufacturing processes, and computer simulation, to address real engineering problems and improve product performance and reliability.
            </p>
            <Button asChild>
              <Link to="/contact">Explore Collaboration Opportunities</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 