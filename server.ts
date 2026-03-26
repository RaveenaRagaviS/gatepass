import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const JWT_SECRET = "gatepass-secret-key-123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // In-memory database
  let passes: any[] = [];
  let users: any[] = [];

  // Authentication Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const authorize = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { name, id, password, role } = req.body;
    if (users.find(u => u.id === id)) {
      return res.status(400).json({ error: "User ID already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { name, id, password: hashedPassword, role };
    users.push(newUser);
    res.status(201).json({ message: "User created successfully" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { id, password } = req.body;
    const user = users.find(u => u.id === id);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true, sameSite: "none", secure: true });
    res.json({ user: { id: user.id, name: user.name, role: user.role } });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not logged in" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ user: decoded });
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Gate Pass Routes
  app.get("/api/passes", authenticate, (req: any, res) => {
    if (req.user.role === 'student') {
      return res.json(passes.filter(p => p.studentId === req.user.id));
    }
    if (req.user.role === 'faculty') {
      return res.json(passes.filter(p => p.status === 'pending_faculty'));
    }
    if (req.user.role === 'warden') {
      return res.json(passes.filter(p => p.status === 'pending_warden' || p.status === 'approved' || p.status === 'rejected' || p.status === 'exited' || p.status === 'returned'));
    }
    res.json(passes);
  });

  app.post("/api/passes", authenticate, authorize(['student']), (req: any, res) => {
    const { reason, exitTime, expectedReturnTime } = req.body;
    const newPass = {
      id: uuidv4(),
      studentId: req.user.id,
      studentName: req.user.name,
      reason,
      exitTime,
      expectedReturnTime,
      status: "pending_faculty", // pending_faculty, pending_warden, approved, rejected, exited, returned
      requestDate: new Date().toISOString(),
      qrCode: "",
    };
    passes.push(newPass);
    res.status(201).json(newPass);
  });

  app.patch("/api/passes/:id", authenticate, authorize(['faculty', 'warden']), (req: any, res) => {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'approved' or 'rejected'
    const passIndex = passes.findIndex(p => p.id === id);
    
    if (passIndex !== -1) {
      const pass = passes[passIndex];
      
      if (req.user.role === 'faculty') {
        if (status === 'approved') {
          pass.status = 'pending_warden';
          pass.facultyRemarks = remarks;
          pass.facultyApprovalDate = new Date().toISOString();
        } else {
          pass.status = 'rejected';
          pass.remarks = remarks;
        }
      } else if (req.user.role === 'warden') {
        if (status === 'approved') {
          pass.status = 'approved';
          pass.wardenRemarks = remarks;
          pass.wardenApprovalDate = new Date().toISOString();
          pass.qrCode = `GATEPASS-${id}`;
        } else {
          pass.status = 'rejected';
          pass.remarks = remarks;
        }
      }
      
      res.json(pass);
    } else {
      res.status(404).json({ error: "Pass not found" });
    }
  });

  app.post("/api/verify", authenticate, authorize(['security']), (req, res) => {
    const { qrCode } = req.body;
    const pass = passes.find(p => p.qrCode === qrCode);
    
    if (pass) {
      if (pass.status === 'approved') {
        pass.status = 'exited';
        pass.actualExitTime = new Date().toISOString();
        res.json({ success: true, message: "Pass verified. Student allowed to exit.", pass });
      } else if (pass.status === 'exited') {
        pass.status = 'returned';
        pass.actualReturnTime = new Date().toISOString();
        res.json({ success: true, message: "Return verified. Student back on campus.", pass });
      } else {
        res.status(400).json({ success: false, message: `Pass status is ${pass.status}` });
      }
    } else {
      res.status(404).json({ success: false, message: "Invalid QR Code" });
    }
  });

  app.get("/api/stats", authenticate, (req, res) => {
    const stats = {
      total: passes.length,
      pendingFaculty: passes.filter(p => p.status === 'pending_faculty').length,
      pendingWarden: passes.filter(p => p.status === 'pending_warden').length,
      approved: passes.filter(p => p.status === 'approved').length,
      onLeave: passes.filter(p => p.status === 'exited').length,
      returned: passes.filter(p => p.status === 'returned').length,
    };
    res.json(stats);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
