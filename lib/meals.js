// import fs from 'node:fs';
import { S3 } from "@aws-sdk/client-s3";

import sql from "better-sqlite3";
import slugify from "slugify";
import xss from "xss";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

// Now you can access your environment variables using process.env
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Use the variables in your code
const s3 = new S3({
  region: "eu-north-1", // My Region
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});
const db = sql("meals.db");

// Rest of your code...

export async function getMeals() {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // throw new Error('Loading meals failed');
  return db.prepare("SELECT * FROM meals").all();
}

export function getMeal(slug) {
  return db.prepare("SELECT * FROM meals WHERE slug = ?").get(slug);
}

export async function saveMeal(meal) {
  try {
    meal.slug = slugify(meal.title, { lower: true });
    meal.instructions = xss(meal.instructions);

    // Generate file name
    const extension = meal.image.name.split(".").pop();
    const fileName = `${meal.image.name}`;

    console.log("Generated file name:", fileName);

    const bufferedImage = await meal.image.arrayBuffer();

    // Upload image to S3 bucket
    await s3.putObject({
      Bucket: "usmanmahmood-nextjs-demo-users-image",
      Key: fileName,
      Body: Buffer.from(bufferedImage),
      ContentType: meal.image.type,
    });

    // Update meal record with image filename
    meal.image = fileName;

    // Insert meal record into database
    db.prepare(
      `
      INSERT INTO meals
        (title, summary, instructions, creator, creator_email, image, slug)
      VALUES (
        @title,
        @summary,
        @instructions,
        @creator,
        @creator_email,
        @image,
        @slug
      )
    `
    ).run(meal);
  } catch (err) {
    console.error("Error saving meal:", err);
  }
}
