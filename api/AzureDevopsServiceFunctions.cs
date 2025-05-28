using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System;

namespace AzureDevops.Functions;

public class AzureDevopsServiceFunctions
{
    private readonly HttpClient _httpClient = new HttpClient();
    private readonly string _pat = Environment.GetEnvironmentVariable("AZURE_PAT");
    private readonly string _baseUrl = Environment.GetEnvironmentVariable("AZURE_DEVOPS_BASEURL");
    private readonly string _project = Environment.GetEnvironmentVariable("AZURE_DEVOPS_PROJECT");

    [Function("GetCompletedPRs")]
    public async Task<HttpResponseData> GetCompletedPRs(
        [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetCompletedPRs");
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var repo = query["repo"];
        var fromDate = query["fromDate"];
        var toDate = query["toDate"];
        if (string.IsNullOrEmpty(repo))
            return req.CreateResponse(System.Net.HttpStatusCode.BadRequest);

        var url = $"{_baseUrl}/{_project}/_apis/git/repositories/{repo}/pullrequests?searchCriteria.status=completed&searchCriteria.queryTimeRangeType=closed";
        if (!string.IsNullOrEmpty(fromDate)) url += $"&searchCriteria.minTime={Uri.EscapeDataString(fromDate)}";
        if (!string.IsNullOrEmpty(toDate)) url += $"&searchCriteria.maxTime={Uri.EscapeDataString(toDate)}";
        url += "&api-version=7.1-preview.1";

        var request = new HttpRequestMessage(HttpMethod.Get, url);
        var token = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{_pat}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        var response = await _httpClient.SendAsync(request);
        var result = await response.Content.ReadAsStringAsync();
        var httpResponse = req.CreateResponse(response.IsSuccessStatusCode ? System.Net.HttpStatusCode.OK : System.Net.HttpStatusCode.BadRequest);
        await httpResponse.WriteStringAsync(result);
        return httpResponse;
    }

    [Function("GetReviewers")]
    public async Task<HttpResponseData> GetReviewers(
        [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetReviewers");
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var repo = query["repo"];
        var prId = query["prId"];
        if (string.IsNullOrEmpty(repo) || string.IsNullOrEmpty(prId))
            return req.CreateResponse(System.Net.HttpStatusCode.BadRequest);

        var url = $"{_baseUrl}/{_project}/_apis/git/repositories/{repo}/pullRequests/{prId}/reviewers?api-version=7.1-preview.1";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        var token = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{_pat}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        var response = await _httpClient.SendAsync(request);
        var result = await response.Content.ReadAsStringAsync();
        var httpResponse = req.CreateResponse(response.IsSuccessStatusCode ? System.Net.HttpStatusCode.OK : System.Net.HttpStatusCode.BadRequest);
        await httpResponse.WriteStringAsync(result);
        return httpResponse;
    }

    [Function("GetRepositories")]
    public async Task<HttpResponseData> GetRepositories(
        [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetRepositories");
        // Ensure _baseUrl does not end with a slash
        var baseUrl = _baseUrl?.TrimEnd('/');
        // Ensure _baseUrl and _project are set and valid
        if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(_project))
        {
            logger.LogError($"Missing or invalid baseUrl/project. baseUrl: '{baseUrl}', project: '{_project}'");
            var errorResponse = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync($"Missing or invalid baseUrl/project. baseUrl: '{baseUrl}', project: '{_project}'");
            return errorResponse;
        }
        var url = $"{baseUrl}/{_project}/_apis/git/repositories?api-version=7.1";
        if (!Uri.IsWellFormedUriString(url, UriKind.Absolute))
        {
            logger.LogError($"Invalid URI: {url}");
            var errorResponse = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync($"Invalid URI: {url}");
            return errorResponse;
        }
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        var token = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{_pat}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        var response = await _httpClient.SendAsync(request);
        var result = await response.Content.ReadAsStringAsync();
        var httpResponse = req.CreateResponse(response.IsSuccessStatusCode ? System.Net.HttpStatusCode.OK : System.Net.HttpStatusCode.BadRequest);
        await httpResponse.WriteStringAsync(result);
        return httpResponse;
    }
}