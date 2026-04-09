using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CatalagoApi.Migrations
{
    /// <inheritdoc />
    public partial class CategoriaOrdemExibicao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Prioridade",
                table: "Categorias",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Prioridade",
                table: "Categorias");
        }
    }
}
