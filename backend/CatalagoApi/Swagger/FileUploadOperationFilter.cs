using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace CatalagoApi.Swagger;

public class FileUploadOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var fileParams = context.ApiDescription.ParameterDescriptions
            .Where(p => p.Type == typeof(IFormFile));

        if (!fileParams.Any())
            return;

        operation.RequestBody = new OpenApiRequestBody
        {
            Content = new Dictionary<string, OpenApiMediaType>
            {
                ["multipart/form-data"] = new OpenApiMediaType
                {
                    Schema = new OpenApiSchema
                    {
                        Type = "object",
                        Properties = fileParams.ToDictionary(
                            p => p.Name,
                            _ => new OpenApiSchema
                            {
                                Type = "string",
                                Format = "binary",
                                Description = "Arquivo"
                            }),
                        Required = fileParams
                            .Where(p => p.Type == typeof(IFormFile))
                            .Select(p => p.Name)
                            .ToHashSet()
                    }
                }
            }
        };

        // Remove os parâmetros IFormFile da lista (já estão no RequestBody)
        foreach (var param in operation.Parameters?.ToList() ?? [])
        {
            var desc = context.ApiDescription.ParameterDescriptions
                .FirstOrDefault(p => p.Name == param.Name);
            if (desc != null && desc.Type == typeof(IFormFile))
                operation.Parameters.Remove(param);
        }
    }
}
