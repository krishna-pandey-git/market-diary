FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY MarketDiary.Api/MarketDiary.Api.csproj MarketDiary.Api/
RUN dotnet restore MarketDiary.Api/MarketDiary.Api.csproj
COPY MarketDiary.Api/ MarketDiary.Api/
RUN dotnet publish MarketDiary.Api/MarketDiary.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
COPY --from=build /app/publish .
RUN mkdir /data && chown $APP_UID /data
USER $APP_UID
VOLUME /data
ENTRYPOINT ["dotnet", "MarketDiary.Api.dll"]
