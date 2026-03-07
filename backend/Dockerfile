FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY CatalagoApi/CatalagoApi.csproj CatalagoApi/
RUN dotnet restore CatalagoApi/CatalagoApi.csproj
COPY . .
WORKDIR /src/CatalagoApi
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM base AS final
RUN apt-get update && apt-get install -y --no-install-recommends adduser libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/* \
    && adduser --disabled-password --gecos "" appuser
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
USER appuser
ENTRYPOINT ["dotnet", "CatalagoApi.dll"]
