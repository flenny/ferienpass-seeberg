[![Languages](https://skillicons.dev/icons?i=js,html,css,gcp,bash,githubactions,linux,vscode)](https://skillicons.dev)

[![Deploy](https://github.com/flenny/ferienpass-seeberg/actions/workflows/deploy.yml/badge.svg)](https://github.com/flenny/ferienpass-seeberg/actions/workflows/deploy.yml)
![GitHub](https://img.shields.io/github/license/flenny/ferienpass-seeberg)

# Ferienpass Seeberg Registration Form

Welcome to the ferienpass-seeberg repository! This repository contains the source code and documentation for the registration form of the Ferienpass Seeberg, a holiday program for kids in the Seeberg region of Switzerland.

## About the Ferienpass Seeberg

The Ferienpass Seeberg is a popular program for children between the ages of 6 and 16, organized by the association Ferienpass Seeberg. The program offers a variety of activities and events during one week in the summer holidays, such as sports, crafts, excursions, and much more. Children can choose from a wide range of activities and have fun with other kids while learning new things.

## About the Registration Form

The registration form is primarily designed to allow parents to book courses for their children. The website is built using HTML, CSS, and JavaScript and uses Google Apps Script as a backend for processing the course bookings. The registration form includes the following features:

- Information about the program, including dates, activities, and prices
- Detailed information about each course, including availability and age requirements
- A registration form for parents to book courses for their children
- An administration interface (Google Spreadsheet) to manage the courses, registrations and volunteers

## Getting Started

### Prerequisites

Before you start, make sure you have the following installed on your machine:

- Docker: You can download and install Docker from the official website at https://www.docker.com/.
- Visual Studio Code: You can download and install VS Code from the official website at https://code.visualstudio.com/.

### Development

1. Clone the ferienpass-seeberg project from GitHub to your local machine using Git or any other method you prefer. You can use the following command in your terminal or command prompt:

    ```bash
    git clone https://github.com/flenny/ferienpass-seeberg.git
    ```

1. Navigate to the ferienpass-seeberg project directory and open the project with VS Code. After that, VS Code is requesting to reopen the project in the pre-defined Docker Dev-Container.

    ```bash
    cd ferienpass-seeberg
    code .
    ```

1. The 'src' directory contains the Apps Script project files. clasp cli is already installed in the Docker container. If you haven't authenticated with Google using clasp in the Docker container yet, you need to do it once. Run the following command to authenticate:

    ```bash
    clasp login
    ```

1. Now use clasp commands to manage the Apps Script project. For example, you can use `clasp push` to push your local changes to the Apps Script project, and `clasp pull` to pull the latest changes from the Apps Script project to your local machine.

## Contributing

We welcome contributions to the ferienpass-seeberg repository! If you find a bug or have a feature request, please open an issue on the repository.

## License

The ferienpass-seeberg repository is released under the MIT License. See the LICENSE file for details.

## Contact

If you have any questions or comments about the Ferienpass Seeberg or the website, please contact us at support@ferienpass-seeberg.ch.
