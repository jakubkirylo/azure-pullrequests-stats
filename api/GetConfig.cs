using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace AzureDevops.Functions;

public class GetConfig
{
    private readonly ILogger<GetConfig> _logger;

    public GetConfig(ILogger<GetConfig> logger)
    {
        _logger = logger;
    }

    [Function("GetConfig")]
    public IActionResult Run([HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequest req)
    {
        string devTestPhrase = Environment.GetEnvironmentVariable("DEV_TEST_PHRASE");
        string daysBack = Environment.GetEnvironmentVariable("DAYS_BACK");

        var config = new
        {
            devTestPhrase,
            daysBack,
        };

        return new OkObjectResult(config);
    }
}