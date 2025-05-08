import { Progress } from "@/components/ui/progress";

export default function Skills() {
  const semiconductorSkills = [
    { name: "Photolithography", level: 95 },
    { name: "Deposition", level: 90 },
    { name: "Etching", level: 92 },
    { name: "PDMS Microfluidic Structure Bonding", level: 88 },
    { name: "WLP", level: 83 },
  ];

  const cadSkills = [
    { name: "AutoCAD", level: 90 },
    { name: "SolidWorks", level: 92 },
  ];

  const simulationSkills = [
    { name: "COMSOL", level: 95 },
    { name: "ANSYS", level: 90 },
    { name: "OpenFilter", level: 85 },
  ];

  const programmingSkills = [
    { name: "Python", level: 85 },
    { name: "C++", level: 80 },
    { name: "Matlab", level: 88 },
    { name: "JavaScript", level: 75 },
  ];

  const SkillSection = ({ title, skills }: { title: string; skills: { name: string; level: number }[] }) => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="space-y-4">
        {skills.map((skill) => (
          <div key={skill.name} className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{skill.name}</span>
              <span className="text-muted-foreground">{skill.level}%</span>
            </div>
            <Progress value={skill.level} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Professional Skills</h1>
        <p className="text-muted-foreground max-w-2xl">
          My technical skills and professional skills overview, covering semiconductor processes, CAD design, simulation analysis, and programming development.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <SkillSection title="Semiconductor Processes" skills={semiconductorSkills} />
        <SkillSection title="CAD and Design" skills={cadSkills} />
        <SkillSection title="Simulation and Analysis" skills={simulationSkills} />
        <SkillSection title="Programming" skills={programmingSkills} />
      </div>

      <div className="p-6 border rounded-lg shadow-sm bg-muted/50 mt-8">
        <h3 className="text-xl font-semibold mb-4">Professional Strengths</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li>• Experience in developing automatic optical inspection (AOI) systems</li>
          <li>• Deep learning model construction for image recognition</li>
          <li>• Advanced packaging structure design</li>
          <li>• Research on MEMS-based pressure sensors</li>
          <li>• Optical component design and manufacturing</li>
        </ul>
      </div>
    </div>
  );
} 