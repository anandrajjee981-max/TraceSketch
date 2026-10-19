import { Request, Response } from "express";
import {
  getOpenApiDocById,
  getOpenApiDocsByRepo,
  getAllOpenApiDocs,
  saveOpenApiDoc,
  deleteOpenApiDoc as deleteOpenApiDocById,
} from "../dao/openApi";

export async function createOpenApiDoc(req: Request, res: Response) {
  try {
    const { name, version, base_url, content, repo } = req.body;
    if (!name || !version || !base_url || !content) {
      return res.status(400).json({ message: "name, version, base_url and content are required" });
    }
    const success = saveOpenApiDoc(name, version, base_url, content, repo ?? null);
    if (!success) {
      return res.status(500).json({ message: "Failed to save openapi doc" });
    }
    res.status(200).json({ message: "openapi doc created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}

export async function getOpenApiDoc(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const doc = getOpenApiDocById(id);
    if (!doc) {
      return res.status(404).json({ message: "openapi doc not found" });
    }
    res.status(200).json({ message: "openapi doc found", doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}

export async function getOpenApiDocs(req: Request, res: Response) {
  try {
    const repo = req.query.repo as string | undefined;
    let docs;
    if (repo) {
      docs = getOpenApiDocsByRepo(repo);
    } else {
      docs = getAllOpenApiDocs();
    }
    res.status(200).json({ message: "openapi docs found", docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}

export async function deleteOpenApiDoc(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = getOpenApiDocById(id);
    if (!existing) {
      return res.status(404).json({ message: "openapi doc not found" });
    }
    const success = deleteOpenApiDocById(id);
    if (!success) {
      return res.status(500).json({ message: "Failed to delete openapi doc" });
    }
    res.status(200).json({ message: "openapi doc deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}
