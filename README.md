# azure-pullrequests-stats

Simple tool to get some statistics and data visualization for Azure DevOps pull requests.

The idea was to get the numbers for who is accepting most PRs utilizing Azure Api for Pull Requests and Repositories:
https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests?view=azure-devops-rest-7.1
https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories?view=azure-devops-rest-7.1

Functions:
1. Charting done by ngxCharts
2. Filtering on Repo name (multiselect), Start-End Dates (Date picker) and additional check if PR was dev -> test merge
3. Clicking on chart row shows detailed list of PRs accepted by given user - includes link to the Pull Request
4. Utilizing Angular Materials

To Do:
1. Implement Tailwind CSS for css 
2. Implement some authorization to access the data OR
3. Implement some data anonimization 
4. Implement simple store to store data
5. AzureDevOpsServiceFunctions must be rewritten and optimized as they are AI generated and it's a mess
6. ~~Make some hardcoded parameters configurable~~
7. ~~Move PAT out of solution~~

The app is hosted on Azure: {}
![azure2](https://github.com/user-attachments/assets/53f9a5bf-b4aa-4a09-a344-7e41700abb48)
![azure1](https://github.com/user-attachments/assets/0c594661-eba3-4a68-9276-343ea3ec7ec1)

Continuous integration is handled by GitHub Actions.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.6.

