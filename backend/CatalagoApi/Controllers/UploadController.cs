using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin")]
public class UploadController : ControllerBase
{
    private readonly UploadService _uploadService;

    public UploadController(UploadService uploadService) => _uploadService = uploadService;

    [HttpPost("produto")]
    [RequestSizeLimit(5_242_880)] // 5 MB
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadProduto(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var (url, erro) = await _uploadService.UploadImagemProdutoAsync(
            stream, file.Length, file.FileName, file.ContentType, ct);

        if (url == null)
            return BadRequest(new { message = erro });

        return Ok(new { url });
    }
}
