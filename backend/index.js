const express = require("express");
const db = require("./db");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static("public"));

const secret = "anything_secret";

// uploading picture to server
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../frontend/public/upload");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("image"), function (req, res) {
  res.json(req.file);
});

//  ============================   auth api's  ======================

// register api
app.post("/register", (req, res) => {
  const q = "select * from users where username = ? or email = ?";
  db.query(q, [req.body.username, req.body.email], (err, data) => {
    if (err) return res.json(err);
    if (data.length) return res.json({ message: "User already exits" });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);

    const Q =
      "insert into users (username,email,password,role_id,isActive) values(?,?,?,2,1)";
    db.query(Q, [req.body.username, req.body.email, hash], (err, response) => {
      if (err) return res.json(err);
      return res.json({ message: "User has been created" });
    });
  });
});

// login api
app.post("/login", (req, res) => {
  const q = "select * from users where username = ?";
  db.query(q, [req.body.username], (err, data) => {
    if (err) {
      console.log(err);
    } else if (data.length > 0) {
      const isPasswordCorrect = bcrypt.compareSync(
        req.body.password,
        data[0].password
      );
      if (!isPasswordCorrect) {
        res.json({ message: "Wrong username or password" });
      } else {
        const { password, email, ...other } = data[0];
        const token = jwt.sign({ id: data[0].id }, secret, { expiresIn: "1d" });

        res.cookie("token", token).json(other);
      }
    } else {
      res.send({ message: "No user found" });
    }
  });
});
app.post("/Adminlogin", (req, res) => {
  const q = "select * from users where username = ? and role_id = 1";
  db.query(q, [req.body.username], (err, data) => {
    if (err) {
      console.log(err);
    } else if (data.length > 0) {
      const isPasswordCorrect = bcrypt.compareSync(
        req.body.password,
        data[0].password
      );
      if (!isPasswordCorrect) {
        res.json({ message: "Wrong Admin username or password" });
      } else {
        const { password, ...other } = data[0];
        const token = jwt.sign({ id: data[0].id }, secret, { expiresIn: "1d" });

        res.cookie("token", token).json(other);
      }
    } else {
      res.send({ message: "No Admin found with this username" });
    }
  });
});

// logout api
app.post("/logout", (req, res) => {
  res
    .clearCookie("token", {
      sameSite: "none",
      secure: true,
    })
    .json({ message: "User has been logout" });
});

// ========================  post api

// all post api
app.get("/posts", (req, res) => {
  const q = req.query.cat
    ? "select p.id,p.title,p.description,p.img,p.date,p.user_id, c.cat from posts as p join category as c on p.cat_id = c.id join users as u on u.id = p.user_id where c.cat = ? and u.isActive =1"
    : "select p.id,p.title,p.description,p.img,p.date,p.user_id, c.cat from posts as p join category as c on p.cat_id = c.id join users as u on u.id = p.user_id where u.isActive = 1";
  db.query(q, [req.query.cat], (err, data) => {
    if (err) {
      res.json(err);
    } else {
      res.json(data);
    }
  });
});

// single post api
app.get("/post/:id", (req, res) => {
  const q =
    "select p.id,username,title,description,c.cat,date,p.img as postImg,u.img as userImg from users as u join posts as p on u.id = p.user_id join category as c on p.cat_id = c.id where p.id = ?";
  db.query(q, [req.params.id], (err, data) => {
    if (err) {
      res.json(err);
    } else {
      res.json(data[0]);
    }
  });
});

// delete post api
app.delete("/deletePost/:id", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  jwt.verify(token, secret, (err, userInfo) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    const postId = req.params.id;
    const userId = userInfo.id;

    const q = "DELETE FROM posts WHERE id = ? AND user_id = ?";
    db.query(q, [postId, userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
      }
      if (result.affectedRows === 0) {
        return res.status(403).json({
          message: "This post doesn't belong to you or does not exist",
        });
      }
      return res.json({ message: "Post deleted successfully", token });
    });
  });
});

// add post api
app.post("/add-post", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  jwt.verify(token, secret, (err, userInfo) => {
    if (err) {
      return res.status(403).json({ message: "token is not valid" });
    } else {
      const q =
        "insert into posts (`title`, `description`,`img`,`date`,`user_id`,`cat_id`) values(?)";
      const values = [
        req.body.title,
        req.body.description,
        req.body.img,
        req.body.date,
        userInfo.id,
        req.body.cat_id,
      ];
      db.query(q, [values], (err, data) => {
        if (err) {
          res.json(err);
        } else {
          res.json({ message: "post has been created" });
        }
      });
    }
  });
});

// update post api
app.put("/update-post/:id", (req, res) => {
  const q = `update posts set title=? ,description=? , cat_id=? where id=${req.params.id}`;
  const values = [req.body.title, req.body.description, req.body.cat_id];
  db.query(q, values, (err, data) => {
    if (err) {
      res.json(err);
    } else {
      res.json({ message: "Post has been updated" });
    }
  });
});

// search post api
app.get("/search/:key", (req, res) => {
  const searchTerm = req.params.key;
  const query = `
  select p.id,p.title,p.description,p.img,p.date,p.user_id, c.cat from posts as p join category as c on p.cat_id = c.id
        WHERE p.title LIKE '%${searchTerm}%' OR c.cat LIKE '%${searchTerm}%'
    `;

  db.query(query, (err, data) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(data);
    }
  });
});

// ========================  admin api

// getting all post
app.get("/AdminGetAllPost", (req, res) => {
  const q =
    "SELECT p.id AS post_id, p.user_id, p.cat_id, u.role_id, u.username, p.title, p.description, p.img AS post_img, p.date, c.cat AS category, u.email, u.img AS userImg, r.role, u.isActive AS UserIsActive, p.isActive AS PostIsActive FROM posts AS p JOIN category AS c ON p.cat_id = c.id JOIN users AS u ON u.id = p.user_id JOIN roles AS r ON r.id = u.role_id";
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.json(data);
  });
});

// getting post by category
app.get("/AdminGetArtPost", (req, res) => {
  const q = `SELECT p.id AS post_id, p.user_id, p.cat_id, u.role_id, u.username, p.title, p.description, p.img AS post_img, p.date, c.cat AS category, u.email, u.img AS userImg, r.role, u.isActive AS UserIsActive, p.isActive AS PostIsActive FROM posts AS p JOIN category AS c ON p.cat_id = c.id JOIN users AS u ON u.id = p.user_id JOIN roles AS r ON r.id = u.role_id where c.cat = 'art' `;
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.json(data);
  });
});

app.get("/AdminGetSciencePost", (req, res) => {
  const q = `SELECT p.id AS post_id, p.user_id, p.cat_id, u.role_id, u.username, p.title, p.description, p.img AS post_img, p.date, c.cat AS category, u.email, u.img AS userImg, r.role, u.isActive AS UserIsActive, p.isActive AS PostIsActive FROM posts AS p JOIN category AS c ON p.cat_id = c.id JOIN users AS u ON u.id = p.user_id JOIN roles AS r ON r.id = u.role_id where c.cat = 'science' `;
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.json(data);
  });
});

app.get("/AdminGetTechnologyPost", (req, res) => {
  const q = `SELECT p.id AS post_id, p.user_id, p.cat_id, u.role_id, u.username, p.title, p.description, p.img AS post_img, p.date, c.cat AS category, u.email, u.img AS userImg, r.role, u.isActive AS UserIsActive, p.isActive AS PostIsActive FROM posts AS p JOIN category AS c ON p.cat_id = c.id JOIN users AS u ON u.id = p.user_id JOIN roles AS r ON r.id = u.role_id where c.cat = 'technology' `;
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.json(data);
  });
});

app.get("/AdminGetCinemaPost", (req, res) => {
  const q = `SELECT p.id AS post_id, p.user_id, p.cat_id, u.role_id, u.username, p.title, p.description, p.img AS post_img, p.date, c.cat AS category, u.email, u.img AS userImg, r.role, u.isActive AS UserIsActive, p.isActive AS PostIsActive FROM posts AS p JOIN category AS c ON p.cat_id = c.id JOIN users AS u ON u.id = p.user_id JOIN roles AS r ON r.id = u.role_id where c.cat = 'cinema' `;
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.json(data);
  });
});

app.get("/AdminGetDesignPost", (req, res) => {
  const q = `SELECT p.id AS post_id, p.user_id, p.cat_id, u.role_id, u.username, p.title, p.description, p.img AS post_img, p.date, c.cat AS category, u.email, u.img AS userImg, r.role, u.isActive AS UserIsActive, p.isActive AS PostIsActive FROM posts AS p JOIN category AS c ON p.cat_id = c.id JOIN users AS u ON u.id = p.user_id JOIN roles AS r ON r.id = u.role_id where c.cat = 'design' `;
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.json(data);
  });
});

app.get("/AdminGetFoodPost", (req, res) => {
  const q = `SELECT p.id AS post_id, p.user_id, p.cat_id, u.role_id, u.username, p.title, p.description, p.img AS post_img, p.date, c.cat AS category, u.email, u.img AS userImg, r.role, u.isActive AS UserIsActive, p.isActive AS PostIsActive FROM posts AS p JOIN category AS c ON p.cat_id = c.id JOIN users AS u ON u.id = p.user_id JOIN roles AS r ON r.id = u.role_id where c.cat = 'food' `;
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.json(data);
  });
});

// deactivating and reactivating post
app.put("/DeActivatePost/:id", (req, res) => {
  const postId = req.params.id;
  const q = `update posts set isActive = 0 where id =${postId}`;
  db.query(q, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.json({ message: "Post has been deActivated" });
    }
  });
});

app.put("/ReActivatePost/:id", (req, res) => {
  const postId = req.params.id;
  const q = `update posts set isActive = 1 where id =${postId}`;
  db.query(q, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.json({ message: "Post has been Activated" });
    }
  });
});

// deactivating and reactivating user

app.put("/DeActivateUser/:id", (req, res) => {
  const userId = req.params.id;
  const q = `update users set isActive = 0 where id =${userId}`;
  db.query(q, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.json({ message: "User has been deActivated" });
    }
  });
});

app.put("/ReActivateUser/:id", (req, res) => {
  const userId = req.params.id;
  const q = `update users set isActive = 1 where id =${userId}`;
  db.query(q, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.json({ message: "User has been Activated" });
    }
  });
});

// ===== getting users
app.get("/GetAllUsers", (req, res) => {
  const q = "select id,username,email,isActive from users where role_id = 2";
  db.query(q, (err, data) => {
    if (err) {
      res.send(err);
    }
    res.send(data);
  });
});

// =========  port
app.listen(3000, (err, res) => {
  if (err) {
    console.log(err);
  } else {
    console.log("server running");
  }
});
