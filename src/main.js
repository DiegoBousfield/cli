import chalk from "chalk";
import fs from "fs";
import ncp from "ncp";
import path from "path";
import { promisify } from "util";
import execa from "execa";
import Listr from "listr";
import { projectInstall } from "pkg-install";
import rimraf from "rimraf";

const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false
  });
}

async function initGit(options) {
  const result = await execa("git", ["init"], {
    cwd: options.targetDirectory
  });
  if (result.failed) {
    return Promise.reject(new Error("Failed to initialize git"));
  }
  return;
}

async function cloneRepo() {
  const result = await execa("git", [
    "clone",
    "git@github.com:DiegoBousfield/vanilla-boilerplate.git",
    "nome-do-repo"
  ]);
  return;
}

async function deleteOldGitFolder(options) {
  rimraf(
    path.resolve(options.targetDirectory, "vanilla-boilerplate", ".git/"),
    err => {
      if (err) throw err;
    }
  );
  return;
}

export async function createProject(options) {
  options = {
    ...options,
    targetDirectory: options.templateDirectory || process.cwd()
  };

  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    "../../templates",
    options.template.toLowerCase()
  );

  options.templateDirectory = templateDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.error("%s Invalid template name", chalk.red.bold("ERROR"));
    process.exit(1);
  }

  const task = new Listr([
    // {
    //   title: "Copy project files",
    //   task: () => copyTemplateFiles(options)
    // },
    {
      title: "Clone Repo",
      task: () => cloneRepo()
    },
    {
      title: "Delete Git folder",
      task: () => deleteOldGitFolder(options)
    },
    {
      title: "Install dependencies",
      task: () =>
        projectInstall({
          prefer: "yarn",
          cwd: options.targetDirectory
        }),
      skip: () =>
        !options.runInstall
          ? "Pass --install to automatically install dependencies"
          : undefined
    },
    {
      title: "Initialize git",
      task: () => initGit(options),
      enabled: () => options.git
    }
  ]);

  await task.run();
  console.log("Copy project files");

  console.log("%s Project Ready", chalk.green.bold("DONE"));
  return true;
}
