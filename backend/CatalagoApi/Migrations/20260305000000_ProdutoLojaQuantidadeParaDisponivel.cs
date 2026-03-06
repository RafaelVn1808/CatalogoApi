using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CatalagoApi.Migrations
{
    /// <inheritdoc />
    public partial class ProdutoLojaQuantidadeParaDisponivel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Disponivel",
                table: "ProdutosLoja",
                type: "boolean",
                nullable: true);

            // Migra dados: quem tinha quantidade > 0 fica disponível
            migrationBuilder.Sql("UPDATE \"ProdutosLoja\" SET \"Disponivel\" = (\"Quantidade\" > 0) WHERE \"Quantidade\" IS NOT NULL;");
            migrationBuilder.Sql("UPDATE \"ProdutosLoja\" SET \"Disponivel\" = true WHERE \"Disponivel\" IS NULL;");

            migrationBuilder.DropColumn(
                name: "Quantidade",
                table: "ProdutosLoja");

            migrationBuilder.AlterColumn<bool>(
                name: "Disponivel",
                table: "ProdutosLoja",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Quantidade",
                table: "ProdutosLoja",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE \"ProdutosLoja\" SET \"Quantidade\" = (CASE WHEN \"Disponivel\" = true THEN 1 ELSE 0 END);");

            migrationBuilder.DropColumn(
                name: "Disponivel",
                table: "ProdutosLoja");
        }
    }
}
