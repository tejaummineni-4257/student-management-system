const express = require('express');
const { auth } = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const Student = require('../models/Student');

// Conditionally require Anthropic SDK
let Anthropic = null;
if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' && !process.env.ANTHROPIC_API_KEY.startsWith('AIzaSy')) {
  Anthropic = require('@anthropic-ai/sdk');
}

const router = express.Router();

// Initialize Anthropic client if not Google key
const anthropic = Anthropic && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' && !process.env.ANTHROPIC_API_KEY.startsWith('AIzaSy')
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const callClaude = async (prompt) => {
  if (!process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here' ||
      process.env.ANTHROPIC_API_KEY.startsWith('AIzaSy')) {
    // Mock response for demo purposes (also used when a Google API key is configured)
    if (prompt.includes('summary for a student')) {
      return 'This achievement demonstrates exceptional leadership and technical skills in organizing a major technical event. The student successfully coordinated a team of 50+ participants, showcasing strong project management abilities and innovative problem-solving in the field of computer science. This experience significantly enhanced their portfolio and prepared them for future leadership roles in the industry.';
    } else if (prompt.includes('Analyze this student')) {
      return `**Profile Assessment:** This student shows strong potential in computer science with a solid foundation in programming and project development. Their consistent participation in technical competitions indicates good problem-solving skills and teamwork abilities.

**Key Strengths:**
- Demonstrated technical proficiency through multiple coding competitions
- Strong leadership skills evidenced by event organization roles
- Consistent academic performance with practical application

**Areas for Improvement:**
- Increase participation in research-oriented activities
- Explore interdisciplinary projects to broaden skill set
- Focus on higher-level competitions for greater challenges

**Career Readiness Score: 7.5/10** - The student has a good foundation but could benefit from more diverse experiences and advanced certifications to reach their full potential.`;
    } else if (prompt.includes('Generate professional resume')) {
      return `**Professional Summary:**
Dynamic computer science student with proven track record in technical competitions and project development. Demonstrated leadership through event organization and strong programming skills across multiple technologies. Seeking opportunities to apply technical expertise and innovative problem-solving in challenging environments.

**Skills:**
- Programming Languages: C++, Java, Python
- Web Technologies: React, Node.js, MongoDB
- Technical Competencies: Data Structures, Algorithms, Software Development
- Soft Skills: Team Leadership, Project Management, Communication

**Key Projects & Achievements:**
- Led organization of inter-college coding competition with 200+ participants
- Developed multiple web applications using modern tech stack
- Participated in national-level hackathons with notable rankings
- Contributed to open-source projects and technical workshops

**Extracurricular Activities:**
- Active member of computer science society
- Volunteer technical mentor for junior students
- Participant in various technical seminars and workshops`;
    } else if (prompt.includes('recommend 5 specific opportunities')) {
      return `**Recommended Opportunities:**

1. **Google Summer of Code (GSoC)**
   - Valuable for gaining real-world development experience
   - Start by exploring project ideas on the GSoC website and building relevant skills
   - Benefit: Industry-standard coding practices and mentorship

2. **Smart India Hackathon**
   - National-level competition with government problem statements
   - Get started by forming a team and registering on the official portal
   - Benefit: Exposure to real-world problem-solving and networking

3. **Research Internship at IITs/NITs**
   - Enhance research profile for higher studies
   - Apply through institute websites and connect with professors
   - Benefit: Publication opportunities and research experience

4. **AWS Educate/Cloud Certifications**
   - Industry-recognized credentials for cloud computing
   - Enroll in AWS Educate program and complete certification paths
   - Benefit: High-demand skills and better job prospects

5. **Technical Content Creation**
   - Build personal brand through blogging/podcasting
   - Start writing articles on platforms like Medium or Dev.to
   - Benefit: Improved communication skills and professional networking`;
    } else if (prompt.includes('NAAC accreditation report')) {
      return `The institution demonstrates commendable performance in student participation and activities, with a strong emphasis on co-curricular engagement and evidence of effective implementation of student development programs. This performance aligns well with accreditation criteria focused on student participation and activities, and reflects a solid foundation for continuous improvement in academic and extracurricular outcomes.`;
    } else {
      return 'AI analysis completed. This is a demo response since no Anthropic API key is configured.';
    }
  }

  // Check if it's a Google API key
  if (process.env.ANTHROPIC_API_KEY.startsWith('AIzaSy')) {
    // Use Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.ANTHROPIC_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Google AI API error: ' + JSON.stringify(data));
    }
  } else {
    // Use Anthropic SDK
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      return response.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('AI service error: ' + error.message);
    }
  }
};

// Generate AI summary of achievements
router.post('/achievement-summary', auth, async (req, res) => {
  try {
    const { achievementId } = req.body;
    if (!achievementId || !Achievement.db.base.Types.ObjectId.isValid(achievementId)) {
      return res.status(400).json({ message: 'Invalid achievement ID' });
    }

    const achievement = await Achievement.findOne({ _id: achievementId, student: req.user._id });
    if (!achievement) return res.status(404).json({ message: 'Achievement not found' });

    const prompt = `Generate a professional 2-3 sentence summary for a student's academic achievement portfolio entry:
    
Title: ${achievement.title}
Category: ${achievement.category}
Level: ${achievement.level}
Organization: ${achievement.organizingBody || 'N/A'}
Position/Result: ${achievement.position || 'Participant'}
Date: ${achievement.startDate?.toDateString() || 'N/A'}
Description: ${achievement.description || 'N/A'}

Write a concise, professional summary suitable for an academic portfolio or resume. Highlight the achievement's significance.`;

    const summary = await callClaude(prompt);
    
    achievement.aiSummary = summary;
    await achievement.save();
    
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
});

// Generate student profile analysis
router.post('/profile-analysis', auth, async (req, res) => {
  try {
    const [student, achievements] = await Promise.all([
      Student.findById(req.user._id).select('-password'),
      Achievement.find({ student: req.user._id })
    ]);

    const categoryCount = {};
    achievements.forEach(a => {
      categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
    });

    const prompt = `Analyze this student's academic profile and achievements, then provide:
1. A brief overall profile assessment (2-3 sentences)
2. Key strengths (3 bullet points)
3. Areas for improvement (2-3 suggestions)
4. Career readiness score out of 10 with brief justification

Student Details:
- Program: ${student.program}, Branch: ${student.branch}
- Current Semester: ${student.currentSemester}
- Admission Category: ${student.admissionCategory}

Achievement Summary:
${Object.entries(categoryCount).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}
Total Achievements: ${achievements.length}

International/National Level achievements: ${achievements.filter(a => ['INTERNATIONAL', 'NATIONAL'].includes(a.level)).length}
Research Publications: ${achievements.filter(a => a.category === 'RESEARCH_PUBLICATION').length}
Internships: ${achievements.filter(a => a.category === 'INTERNSHIP').length}

Provide actionable, encouraging feedback suitable for an academic counselor's report.`;

    const analysis = await callClaude(prompt);
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
});

// Generate resume content from achievements
router.post('/generate-resume-content', auth, async (req, res) => {
  try {
    const [student, achievements] = await Promise.all([
      Student.findById(req.user._id).select('-password'),
      Achievement.find({ student: req.user._id, status: 'APPROVED' })
    ]);

    const prompt = `Generate professional resume content sections based on this student's data:

Student: ${student.firstName} ${student.lastName}
Program: ${student.program} in ${student.branch}
Batch: ${student.batch}

Achievements:
${achievements.map(a => `- ${a.title} (${a.category}, ${a.level}, ${a.position || 'Participant'})`).join('\n')}

Generate:
1. Professional Summary (3-4 sentences)
2. Skills section (based on achievements)
3. Key Projects/Achievements section (formatted for resume)
4. Extracurricular Activities section

Format as clean, professional resume content.`;

    const resumeContent = await callClaude(prompt);
    res.json({ resumeContent });
  } catch (error) {
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
});

// AI-powered achievement recommendations
router.post('/recommendations', auth, async (req, res) => {
  try {
    const [student, achievements] = await Promise.all([
      Student.findById(req.user._id).select('-password'),
      Achievement.find({ student: req.user._id })
    ]);

    const prompt = `Based on this student's profile, recommend 5 specific opportunities they should pursue to enhance their academic profile:

Student Profile:
- Program: ${student.program}, Branch: ${student.branch}
- Semester: ${student.currentSemester} of 8
- Current Achievements: ${achievements.length} total
- Categories covered: ${[...new Set(achievements.map(a => a.category))].join(', ')}

For each recommendation provide:
1. Opportunity name/type
2. Why it's valuable for this student
3. How to get started
4. Expected benefit

Focus on practical, achievable opportunities for an Indian engineering student.`;

    const recommendations = await callClaude(prompt);
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
});

// Admin AI: Generate accreditation report
router.post('/accreditation-report', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { branch, academicYear } = req.body;
    const filter = {};
    if (branch) filter['student.branch'] = branch;
    if (academicYear) filter.academicYear = academicYear;

    const achievements = await Achievement.find({ status: 'APPROVED', ...(academicYear && { academicYear }) })
      .populate('student', 'branch program');

    const stats = {
      total: achievements.length,
      byCategory: {},
      byLevel: {},
      national: achievements.filter(a => a.level === 'NATIONAL').length,
      international: achievements.filter(a => a.level === 'INTERNATIONAL').length
    };

    achievements.forEach(a => {
      stats.byCategory[a.category] = (stats.byCategory[a.category] || 0) + 1;
      stats.byLevel[a.level] = (stats.byLevel[a.level] || 0) + 1;
    });

    const prompt = `Generate an NAAC accreditation report summary for student achievements:

Academic Year: ${academicYear || 'All Years'}
Total Approved Achievements: ${stats.total}
National Level: ${stats.national}
International Level: ${stats.international}

Category Breakdown:
${Object.entries(stats.byCategory).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Level Distribution:
${Object.entries(stats.byLevel).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Generate a formal accreditation report paragraph (for NAAC/NBA documentation) highlighting student achievement metrics, with appropriate academic language. Include key performance indicators and how they align with accreditation criteria 5.3 (Student Participation and Activities).`;

    const report = await callClaude(prompt);
    res.json({ report, stats });
  } catch (error) {
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
});

module.exports = router;
