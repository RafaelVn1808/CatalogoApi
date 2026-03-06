using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CatalagoApi.Migrations
{
    /// <inheritdoc />
    public partial class UsuarioDeveAlterarSenha : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "DeveAlterarSenha",
                table: "Usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("UPDATE \"Usuarios\" SET \"DeveAlterarSenha\" = true;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeveAlterarSenha",
                table: "Usuarios");
        }
    }
}
